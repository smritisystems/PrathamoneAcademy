# /**
#  * @file        financial_allocation.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-18
#  * @updated     2026-11-18
#  *
#  * @description Shared deterministic minor-unit allocation for financial ledgers.
#  */

from decimal import Decimal, ROUND_FLOOR
from typing import Sequence, TypeVar


T = TypeVar("T")
CENT = Decimal("0.01")


def allocate_proportionally(
    total: Decimal,
    weighted_items: Sequence[tuple[T, Decimal, tuple]],
) -> list[tuple[T, Decimal]]:
    """Split a currency amount by positive weights with deterministic cent rounding."""
    amount = Decimal(total)
    if amount < 0 or amount != amount.quantize(CENT):
        raise ValueError("Allocation total must be a non-negative currency amount")
    if not weighted_items:
        if amount == 0:
            return []
        raise ValueError("Cannot allocate a positive amount without eligible items")

    weights = [Decimal(weight) for _, weight, _ in weighted_items]
    if any(weight < 0 for weight in weights):
        raise ValueError("Allocation weights cannot be negative")
    total_weight = sum(weights, Decimal("0"))
    if total_weight <= 0:
        raise ValueError("At least one allocation weight must be positive")

    base_allocations: list[Decimal] = []
    remainders: list[Decimal] = []
    for weight in weights:
        exact = amount * weight / total_weight
        base = exact.quantize(CENT, rounding=ROUND_FLOOR)
        base_allocations.append(base)
        remainders.append(exact - base)

    minor_units_left = int((amount - sum(base_allocations, Decimal("0"))) / CENT)
    order = sorted(
        range(len(weighted_items)),
        key=lambda index: (
            -remainders[index],
            weighted_items[index][2],
        ),
    )
    for index in order[:minor_units_left]:
        base_allocations[index] += CENT

    return [
        (weighted_items[index][0], base_allocations[index])
        for index in range(len(weighted_items))
    ]
