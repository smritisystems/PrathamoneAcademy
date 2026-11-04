# Students & Student Portal User Manual

**Target Audience**: Students, Guardians, Teachers, Administrators, Accountants  

---

## 1. Student Portal Guide (For Students & Guardians)

### 1.1 Logging In
1. Visit the Prashant Academy portal (`http://localhost` or `http://localhost:5173`).
2. Enter your student portal username (e.g. `rajnees` or `siddharth`) and your password.
3. Upon signing in, you are automatically directed to your **Student Dashboard** (`/student-portal`).

### 1.2 Navigating the 8 Student Portal Tabs
1. **Home**:
   - View your active enrollment details (Board, Class, Batch, Roll Number).
   - Check key summary metrics: Attendance rate, Fee obligation, Remaining balance, and scheduled classes.
   - Inspect today's lecture schedule with start/end times and classroom numbers.
   - Read announcements and important alerts on the Notice Board.
   - See your latest test marks and grades.
2. **My Classes**:
   - Review enrolled boards (ICSE / CBSE / SSC), classes, batch divisions, and active status.
   - Inspect curriculum subjects along with passing criteria and maximum marks.
3. **Timetable**:
   - Access the complete weekly class schedule from Monday to Saturday.
   - Check subject names, room assignments, and timings for every session.
4. **Attendance**:
   - Check your cumulative attendance percentage and total working days.
   - Review dated attendance history with green (Present), amber (Late), and red (Absent) indicators.
5. **Tests & Results**:
   - View upcoming scheduled assessments and examination dates.
   - Review graded scorecards: marks obtained, percentages, letter grades (A+, A, B, etc.), and teacher remarks.
6. **Fees (Read-Only)**:
   - Check total coaching fee obligation, payments credited, and remaining balance.
   - View fee invoices with installment due dates.
   - Review recorded payment transactions with official receipt numbers.
7. **Study Materials**:
   - Download notes, formula guides, practice question sheets, and syllabus outlines uploaded for your enrolled class.
8. **Profile**:
   - Review your demographic details and guardian contact information.
   - Update contact details (phone, email, residential address, city, pincode, blood group) and click **Save Profile Changes**.

---

## 2. Admin & Teacher Student Profile Guide

### 2.1 Accessing the 360° Profile
1. Click **Students** on the sidebar navigation.
2. Search by student name or admission number, or filter by Standard/Batch.
3. Click the **Eye icon** (`/students/:id`) to open the full 8-tab profile.

### 2.2 Working Across the 8 Profile Tabs
1. **Overview**: View demographic data, attendance percentage, fee balance, and recent test performance.
2. **Enrollment**: Inspect multi-year academic placements, roll numbers, and division assignments.
3. **Classes**: Review subjects taught in the student's standard and batch.
4. **Attendance**: Review 30-day dated attendance records and overall attendance percentage.
5. **Tests**: Check student examination scorecards and subject-wise marks.
6. **Fees**: View invoices, installment breakdown, and payment transaction receipts.
7. **Documents**:
   - View all uploaded student identity documents (Aadhar, Birth Certificate, Marksheets, etc.).
   - Click **Upload Document** to record a new document with title, document type, and file reference.
   - Delete outdated or invalid documents with administrator confirmation.
8. **Activity**: View the system audit timeline tracking admissions, payments, and record updates.

### 2.3 Student Portal Preview (For Admins & Teachers)
- Click **Student Portal View** from the student detail header, or select **Student Portal** in the sidebar.
- Use the **Switch Student** dropdown to inspect exactly what any student sees in their portal.

---

## 3. Full Student Profile Editing (For Administrators)

Authorized administrators (`superadmin`, `admin`, `principal`) have unrestricted access to edit student profile records.

### 3.1 Initiating an Edit
1. Open the student's 360° profile page (`/students/:id`).
2. Click the **Edit Profile** button in the top action header.
3. The comprehensive editing modal opens with 4 dedicated management tabs.

### 3.2 Editable Profile Sections

#### Tab 1: Personal & Demographics
- **First, Middle, & Last Name**: Correct spellings or update names.
- **Gender & Date of Birth**: Standardized select and calendar date picker.
- **Blood Group**: A+, A-, B+, B-, AB+, AB-, O+, O-, or custom.
- **Aadhar & Nationality**: 12-digit Indian national identity number and nationality.
- **Religion & Caste**: Cultural and reservation demographic details.
- **Admission Date & Status**: Update institute joining date and toggle Active / Inactive status.

#### Tab 2: Contact & Address
- **Primary Phone**: 10-digit mobile contact.
- **Email Address**: For electronic notifications and invoices.
- **Residential Address**: Full street/building address, City, State, and 6-digit Pincode.

#### Tab 3: Parents & Guardians
- **Multiple Guardian Support**: Click **+ Add Guardian** to record fathers, mothers, or local guardians.
- **Guardian Details**: Name, phone, email, occupation, and annual income.
- **Primary Contact Designation**: Designate one guardian as primary for automated communications.
- **Removal**: Click **Remove** to delete non-primary or obsolete guardian records.

#### Tab 4: Academic & Batch Assignment (With Transfer Safeguards)
- **Standard / Level**: Reassign to any registered Standard (Class VIII, IX, X, etc.).
- **Batch / Division**: Reassign to any active coaching batch.
- **Roll Number & Enrollment Status**: Update institute roll numbers and enrollment states.

### 3.3 Consequential Change Protocol (Batch Transfers)
When an administrator alters the student's standard or batch:
1. **Automated Detection**: The system immediately flags a consequential batch transfer.
2. **Warning Banner**: An amber alert outlines the operational impact (curriculum and timetable updates).
3. **Financial & Attendance Protection**: Confirms that fee obligations (invoices), historical payment transactions, receipts, and attendance logs will remain 100% preserved.
4. **Mandatory Transfer Reason**: The administrator must provide a written justification (e.g. "Transferred to morning batch").
5. **Confirmation Checkbox**: The administrator must explicitly confirm: *"I confirm this batch transfer and authorize updating the student's active enrollment."*

### 3.4 Audit Trail & History Preservation
- Every profile change and batch transfer is automatically committed to `AuditLog`.
- Logs record the administrator's ID and username, timestamp, and field-level differences.
- Transfer events immediately surface in the student's **Activity** tab.
