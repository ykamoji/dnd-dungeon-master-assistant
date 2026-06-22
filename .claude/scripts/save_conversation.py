import sys
import os
import json

# Directory where per-session conversation logs are written. Each session is
# saved as <session_id>.json. Override the base dir with CONVO_LOG_DIR if desired.
DEFAULT_LOG_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "agent_logs"
)


# Markers that identify slash-command output / harness caveats rather than real
# user input. Exchanges whose input is one of these are skipped.
META_INPUT_MARKERS = (
    "<local-command-caveat>",
    "<local-command-stdout>",
    "<command-name>",
    "<command-message>",
    "<command-args>",
)


def is_meta_input(text):
    stripped = text.lstrip()
    return any(stripped.startswith(marker) for marker in META_INPUT_MARKERS)


def text_from_content(content):
    """Flatten an assistant/user message 'content' field into plain text."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(p for p in parts if p).strip()


def stringify_result(content):
    """Normalize a tool_result content field into a string."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    parts.append(block.get("text", ""))
                else:
                    parts.append(json.dumps(block))
            else:
                parts.append(str(block))
        return "\n".join(parts).strip()
    if content is None:
        return ""
    return json.dumps(content)


def parse_transcript(transcript_path):
    """Read a JSONL transcript and group it into Input / Tools Used / Output exchanges."""
    events = []
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    # First pass: map tool_use_id -> result string (tool results arrive in later user turns).
    tool_results = {}
    for event in events:
        message = event.get("message", {})
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_result":
                tool_results[block.get("tool_use_id")] = stringify_result(
                    block.get("content")
                )

    exchanges = []
    current = None

    def flush():
        if current is not None and (
            current["Input"] or current["Tools Used"] or current["Output"]
        ):
            exchanges.append(current)

    for event in events:
        etype = event.get("type")
        message = event.get("message", {})
        content = message.get("content")

        if etype == "user":
            user_text = text_from_content(content)
            # Skip pure tool-result turns (no real user text); they belong to the
            # in-progress exchange, not a new one.
            is_tool_result_only = isinstance(content, list) and all(
                isinstance(b, dict) and b.get("type") == "tool_result"
                for b in content
            )
            if user_text and not is_tool_result_only and not is_meta_input(user_text):
                flush()
                current = {"Input": user_text, "Tools Used": [], "Output": ""}

        elif etype == "assistant":
            if current is None:
                current = {"Input": "", "Tools Used": [], "Output": ""}
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                btype = block.get("type")
                if btype == "text":
                    text = block.get("text", "").strip()
                    if text:
                        current["Output"] = (
                            (current["Output"] + "\n" + text).strip()
                            if current["Output"]
                            else text
                        )
                elif btype == "tool_use":
                    current["Tools Used"].append(
                        {
                            "tool": block.get("name", ""),
                            "arguments": block.get("input", {}),
                            "result": tool_results.get(block.get("id"), ""),
                        }
                    )

    flush()
    return exchanges


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)

        payload = json.loads(raw)

        transcript_path = payload.get("transcript_path")
        if not transcript_path or not os.path.isfile(transcript_path):
            sys.exit(0)

        exchanges = parse_transcript(transcript_path)
        if not exchanges:
            sys.exit(0)

        # Name the log file after the session id so each session gets its own file.
        session_id = payload.get("session_id") or os.path.splitext(
            os.path.basename(transcript_path)
        )[0]

        log_dir = os.path.abspath(os.environ.get("CONVO_LOG_DIR", DEFAULT_LOG_DIR))
        log_file = os.path.join(log_dir, f"{session_id}.json")

        # The transcript holds the full session, so rewrite the file with the
        # complete parse rather than appending (avoids duplicate exchanges).
        os.makedirs(log_dir, exist_ok=True)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(exchanges, f, indent=2, ensure_ascii=False)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception as e:
        print(f"Hook Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
