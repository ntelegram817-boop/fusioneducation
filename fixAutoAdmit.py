import os
import re

filepath = os.path.join(os.path.dirname(__file__), 'server.js')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    // Recalculate fees
    const billing = await calculateStudentFees(students[sIdx]);
    students[sIdx].fees = {
      total: ${billing.totalAccruedFee.toLocaleString()} BDT,
      paid: ${billing.totalPaid.toLocaleString()} BDT,
      due: ${billing.balanceDue.toLocaleString()} BDT,
      status: billing.status
    };

    await writeData('students.json', students);

    // Also sync admissions.json if exists
    if (aIdx !== -1) {
      admissions[aIdx].payments = students[sIdx].payments;
      admissions[aIdx].feeInfo = {
        ...(admissions[aIdx].feeInfo || {}),
        ...students[sIdx].fees,
        total: students[sIdx].fees.total,
        paid: students[sIdx].fees.paid,
        due: students[sIdx].fees.due,
        status: students[sIdx].fees.status
      };
      await writeData('admissions.json', admissions);
    }'''

replacement = '''    // Recalculate fees
    const billing = await calculateStudentFees(students[sIdx]);
    students[sIdx].fees = {
      total: ${billing.totalAccruedFee.toLocaleString()} BDT,
      paid: ${billing.totalPaid.toLocaleString()} BDT,
      due: ${billing.balanceDue.toLocaleString()} BDT,
      status: billing.status
    };

    // Auto-admit if pending and payment is made
    let wasAutoAdmitted = false;
    if (students[sIdx].status === 'pending' && billing.totalPaid > 0) {
        students[sIdx].status = 'admitted';
        wasAutoAdmitted = true;
    }

    await writeData('students.json', students);

    // Also sync admissions.json if exists
    if (aIdx !== -1) {
      admissions[aIdx].payments = students[sIdx].payments;
      admissions[aIdx].feeInfo = {
        ...(admissions[aIdx].feeInfo || {}),
        ...students[sIdx].fees,
        total: students[sIdx].fees.total,
        paid: students[sIdx].fees.paid,
        due: students[sIdx].fees.due,
        status: students[sIdx].fees.status
      };
      
      if (wasAutoAdmitted) {
          admissions[aIdx].status = 'admitted';
      }
      
      await writeData('admissions.json', admissions);
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Auto-admit logic added to server.js successfully")
else:
    print("Target string not found in server.js")