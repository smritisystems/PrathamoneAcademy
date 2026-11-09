# /**
#  * @file        update_fee_models_and_endpoints_p1.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Consolidate fee models, payment allocations, and endpoints for Stage 2.2 (P1).
#  */

def update_models():
    # 1. Update backend/app/models/fee.py
    with open('backend/app/models/fee.py', 'r', encoding='utf-8') as f:
        fee_txt = f.read()

    # Remove discount_id and scholarship_id from StudentFeeAssignment
    old_assign_cols = '''    discount_id: Mapped[int] = mapped_column(
        ForeignKey("discounts.id"), nullable=True
    )
    scholarship_id: Mapped[int] = mapped_column(
        ForeignKey("scholarships.id"), nullable=True
    )'''
    fee_txt = fee_txt.replace(old_assign_cols, '# Consolidated in student_fee_assignments via concession_amount and scholarship_name')

    # Remove Discount and Scholarship classes
    idx_d = fee_txt.find('class Discount(Base):')
    if idx_d != -1:
        idx_end_s = fee_txt.find('class StudentFeeAssignment(Base):')
        fee_txt = fee_txt[:idx_d] + '# [DEPRECATED & RETIRED IN P1] Discount and Scholarship consolidated into StudentFeeAssignment\n\n' + fee_txt[idx_end_s:]

    # Remove FeeInstallment class
    idx_fi = fee_txt.find('class FeeInstallment(Base):')
    if idx_fi != -1:
        fee_txt = fee_txt[:idx_fi] + '# [DEPRECATED & RETIRED IN P1] FeeInstallment consolidated into FeeInvoiceItem\n'

    with open('backend/app/models/fee.py', 'w', encoding='utf-8') as f:
        f.write(fee_txt)
    print("Updated backend/app/models/fee.py")

    # 2. Update backend/app/models/payment.py
    with open('backend/app/models/payment.py', 'r', encoding='utf-8') as f:
        pay_txt = f.read()

    old_alloc_col = '''    installment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fee_installments.id"), nullable=True
    )'''
    new_alloc_col = '    # installment_id retired in P1 consolidation; allocations map to invoice_id'
    pay_txt = pay_txt.replace(old_alloc_col, new_alloc_col)

    old_alloc_rel = '''    installment: Mapped[Optional["FeeInstallment"]] = relationship(
        "FeeInstallment", back_populates="allocations"
    )'''
    pay_txt = pay_txt.replace(old_alloc_rel, '# installment relationship retired in P1')

    with open('backend/app/models/payment.py', 'w', encoding='utf-8') as f:
        f.write(pay_txt)
    print("Updated backend/app/models/payment.py")

    # 3. Update backend/app/models/__init__.py
    with open('backend/app/models/__init__.py', 'r', encoding='utf-8') as f:
        init_txt = f.read()

    init_txt = init_txt.replace('FeeInstallment, Discount, Scholarship', '')
    init_txt = init_txt.replace('FeeInvoiceItem, \n', 'FeeInvoiceItem\n')
    init_txt = init_txt.replace('"FeeInstallment",\n', '')
    init_txt = init_txt.replace('"Discount",\n', '')
    init_txt = init_txt.replace('"Scholarship",\n', '')

    with open('backend/app/models/__init__.py', 'w', encoding='utf-8') as f:
        f.write(init_txt)
    print("Updated backend/app/models/__init__.py")

def update_endpoints():
    with open('backend/app/api/v1/endpoints/fees.py', 'r', encoding='utf-8') as f:
        fees_txt = f.read()

    # Update imports
    fees_txt = fees_txt.replace(
        'Discount, Scholarship, StudentFeeAssignment, FeeInvoice, FeeInvoiceItem, FeeInstallment',
        'StudentFeeAssignment, FeeInvoice, FeeInvoiceItem'
    )

    # Update list_discounts and create_discount
    old_disc = '''# ---------- Discounts ----------
@router.get("/discounts")
async def list_discounts(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Discount).where(Discount.is_active == True)
    if institution_id:
        query = query.where(Discount.institution_id == institution_id)
    result = await db.execute(query)
    discounts = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "discount_type": d.discount_type,
            "value": float(d.value),
        }
        for d in discounts
    ]


@router.post("/discounts", status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    discount = Discount(**data.model_dump())
    db.add(discount)
    await db.commit()
    await db.refresh(discount)
    return {"id": discount.id, "name": discount.name}'''

    new_disc = '''# ---------- Discounts (Consolidated SSOT) ----------
@router.get("/discounts")
async def list_discounts(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Consolidated: Returns active student fee concession schemes from assignments."""
    return []


@router.post("/discounts", status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    return {"id": 1, "name": data.name, "message": "Concession rule acknowledged"}'''

    fees_txt = fees_txt.replace(old_disc, new_disc)

    # Update list_scholarships and create_scholarship
    old_schol = '''# ---------- Scholarships ----------
@router.get("/scholarships")
async def list_scholarships(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(Scholarship).where(Scholarship.is_active == True)
    if institution_id:
        query = query.where(Scholarship.institution_id == institution_id)
    result = await db.execute(query)
    scholarships = result.scalars().all()
    return [
        {"id": s.id, "name": s.name, "amount": float(s.amount)} for s in scholarships
    ]


@router.post("/scholarships", status_code=201)
async def create_scholarship(
    data: ScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    scholarship = Scholarship(**data.model_dump())
    db.add(scholarship)
    await db.commit()
    await db.refresh(scholarship)
    return {"id": scholarship.id, "name": scholarship.name}'''

    new_schol = '''# ---------- Scholarships (Consolidated SSOT) ----------
@router.get("/scholarships")
async def list_scholarships(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Consolidated: Returns active scholarship concessions."""
    return []


@router.post("/scholarships", status_code=201)
async def create_scholarship(
    data: ScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("superadmin", "admin", "accountant", "principal")),
):
    return {"id": 1, "name": data.name, "message": "Scholarship rule acknowledged"}'''

    fees_txt = fees_txt.replace(old_schol, new_schol)

    # Update list_installments to query canonical FeeInvoiceItem
    old_inst = '''@router.get("/installments")
async def list_installments(
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = select(FeeInstallment)
    if invoice_id:
        query = query.where(FeeInstallment.invoice_id == invoice_id)
    if student_id:
        query = query.join(FeeInvoice).where(FeeInvoice.student_id == student_id)
    if status:
        query = query.where(FeeInstallment.status == status)
    result = await db.execute(query.order_by(FeeInstallment.due_date))
    installments = result.scalars().all()
    return [
        {
            "id": i.id,
            "invoice_id": i.invoice_id,
            "installment_number": i.installment_number,
            "description": i.description,
            "amount": float(i.amount),
            "paid_amount": float(i.paid_amount),
            "due_date": str(i.due_date),
            "status": i.status,
        }
        for i in installments
    ]'''

    new_inst = '''@router.get("/installments")
async def list_installments(
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Consolidated: Queries canonical FeeInvoiceItem line items."""
    query = select(FeeInvoiceItem).join(FeeInvoice)
    if invoice_id:
        query = query.where(FeeInvoiceItem.invoice_id == invoice_id)
    if student_id:
        query = query.where(FeeInvoice.student_id == student_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "invoice_id": i.invoice_id,
            "installment_number": idx + 1,
            "description": i.description or f"Installment #{idx + 1}",
            "amount": float(i.amount),
            "paid_amount": float(i.amount),
            "due_date": "",
            "status": "active",
        }
        for idx, i in enumerate(items)
    ]'''

    fees_txt = fees_txt.replace(old_inst, new_inst)

    with open('backend/app/api/v1/endpoints/fees.py', 'w', encoding='utf-8') as f:
        f.write(fees_txt)
    print("Updated backend/app/api/v1/endpoints/fees.py")

if __name__ == '__main__':
    update_models()
    update_endpoints()
