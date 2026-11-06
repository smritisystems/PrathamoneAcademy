# /**
#  * @file        test_payment_gateway.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Pytest test suite for Razorpay & UPI payment gateway, dynamic UPI QR generation, cryptographic HMAC signature verification, and automated receipt posting.
#  */

import pytest
import hmac
import hashlib
from decimal import Decimal
from fastapi import HTTPException

from app.models.fee import FeeInvoice
from app.models.payment import Payment, PaymentReceipt
from app.services.payment_gateway import (
    get_payment_gateway_config,
    update_payment_gateway_config,
    create_gateway_order,
    verify_razorpay_signature,
    verify_and_post_gateway_payment,
    generate_upi_uri,
)


@pytest.mark.asyncio
async def test_gateway_configuration(db, test_institution):
    """Verifies gateway configuration persistence and masking."""
    # 1. Fetch initial default config
    config = await get_payment_gateway_config(db, test_institution.id)
    assert config["is_enabled"] is True
    assert config["mode"] in ("test", "live")
    assert "upi_vpa" in config

    # 2. Update config
    updated = await update_payment_gateway_config(
        db,
        test_institution.id,
        {
            "is_enabled": True,
            "mode": "test",
            "razorpay_key_id": "rzp_test_CustomKey123",
            "razorpay_key_secret": "custom_secret_key_999",
            "upi_vpa": "academy.fees@okhdfcbank",
            "merchant_name": "Prashant Academy Test",
        },
    )
    assert updated["razorpay_key_id"] == "rzp_test_CustomKey123"
    assert updated["upi_vpa"] == "academy.fees@okhdfcbank"
    assert updated["merchant_name"] == "Prashant Academy Test"


@pytest.mark.asyncio
async def test_create_gateway_order_and_upi_qr(db, test_institution, test_fee_invoice):
    """Verifies online order creation, amount in paise, and dynamic UPI QR code SVG output."""
    invoice = test_fee_invoice["invoice"]
    amount = Decimal("6000.00")
    order_data = await create_gateway_order(
        db=db,
        invoice_id=invoice.id,
        amount=amount,
        institution_id=test_institution.id,
    )

    assert order_data["order_id"].startswith("order_")
    assert order_data["amount"] == Decimal("6000.00")
    assert order_data["amount_in_paise"] == 600000
    assert order_data["currency"] == "INR"
    assert "upi://pay?pa=" in order_data["upi_uri"]
    assert "am=6000.00" in order_data["upi_uri"]
    assert "<svg" in order_data["upi_qr_svg"]

    # Verify exceeding balance throws HTTPException 400
    with pytest.raises(HTTPException) as exc_info:
        await create_gateway_order(
            db=db,
            invoice_id=invoice.id,
            amount=Decimal("999999.00"),
            institution_id=test_institution.id,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_signature_verification_and_financial_posting(
    db, test_institution, test_fee_invoice, admin_user
):
    """Verifies cryptographic signature verification, ledger posting, and idempotency."""
    invoice = test_fee_invoice["invoice"]
    order_id = "order_rzp_test_778899"
    payment_id = "pay_rzp_test_112233"
    secret = "rzp_secret_PrathamOneEduOS2026"
    amount = Decimal("8000.00")

    # Generate genuine HMAC SHA256 signature
    payload = f"{order_id}|{payment_id}"
    signature = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    assert verify_razorpay_signature(order_id, payment_id, signature, secret, is_test_mode=False) is True
    assert verify_razorpay_signature(order_id, payment_id, "invalid_sig", secret, is_test_mode=False) is False
    assert verify_razorpay_signature(order_id, payment_id, "test_signature_valid", secret, is_test_mode=True) is True

    # Initial invoice balance check
    initial_outstanding = invoice.outstanding_amount

    # Post payment through gateway
    result = await verify_and_post_gateway_payment(
        db=db,
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        invoice_id=invoice.id,
        amount=amount,
        current_user_id=admin_user.id,
        institution_id=test_institution.id,
    )

    assert result["status"] == "success"
    assert result["amount"] == amount
    assert result["receipt_number"].startswith("RCP-")

    # Verify invoice was updated
    await db.refresh(invoice)
    assert invoice.paid_amount == amount
    assert invoice.outstanding_amount == initial_outstanding - amount

    # Test Idempotency: Second verification with same payment_id returns already_processed
    dup_result = await verify_and_post_gateway_payment(
        db=db,
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        invoice_id=invoice.id,
        amount=amount,
        current_user_id=admin_user.id,
        institution_id=test_institution.id,
    )
    assert dup_result["status"] == "already_processed"
    assert dup_result["payment_id"] == result["payment_id"]
    assert dup_result["receipt_number"] == result["receipt_number"]


@pytest.mark.asyncio
async def test_online_gateway_api_endpoints(
    client, auth_headers, test_institution, test_fee_invoice, admin_user
):
    """Verifies FastAPI REST endpoints for payment gateway configuration, order creation, and verification."""
    invoice = test_fee_invoice["invoice"]

    # 1. Config Endpoint
    res_cfg = await client.get("/api/v1/payments/online/config", headers=auth_headers)
    assert res_cfg.status_code == 200
    cfg_data = res_cfg.json()
    assert cfg_data["is_enabled"] is True
    assert "razorpay_key_secret_masked" in cfg_data
    assert "razorpay_key_secret" not in cfg_data

    # 2. Create Order Endpoint
    order_res = await client.post(
        "/api/v1/payments/online/create-order",
        headers=auth_headers,
        json={
            "invoice_id": invoice.id,
            "amount": "4500.00",
        },
    )
    assert order_res.status_code == 200
    order_info = order_res.json()
    assert order_info["order_id"].startswith("order_")
    assert order_info["amount"] == 4500.0
    assert order_info["amount_in_paise"] == 450000
    assert "upi_uri" in order_info
    assert "<svg" in order_info["upi_qr_svg"]

    # 3. Verify Payment Endpoint
    verify_res = await client.post(
        "/api/v1/payments/online/verify",
        headers=auth_headers,
        json={
            "order_id": order_info["order_id"],
            "payment_id": f"pay_api_test_{invoice.id}",
            "signature": "test_signature_valid",
            "invoice_id": invoice.id,
            "amount": "4500.00",
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "success"
    assert verify_data["receipt_number"].startswith("RCP-")
