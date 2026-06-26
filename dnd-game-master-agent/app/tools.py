# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""D&D Dice Rolling Tools.

Provides random number generation tools matching standard D&D dice rolling mechanics.
"""

import random


def roll_dice(sides: int = 20, count: int = 1) -> dict:
    """Roll one or more dice with a specified number of sides (e.g. d20, d6, d8).

    Args:
        sides: The number of sides on the dice (default: 20).
        count: The number of dice to roll (default: 1).

    Returns:
        A dictionary containing the individual roll results and the sum total.
    """
    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls)
    return {
        "rolls": rolls,
        "total": total,
        "summary": f"Rolled {count}d{sides} and got {rolls} (Total: {total})",
    }
