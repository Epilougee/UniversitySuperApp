import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, department, year, section, cgpa, attendance, phone, email, batch, address } = body;

    if (!id || !name || !department) {
      return NextResponse.json({ ok: false, message: 'id, name, department required.' }, { status: 400 });
    }

    const existing = await query<any>('SELECT id FROM students WHERE id = ?', [id]);
    if (existing.length) {
      return NextResponse.json({ ok: false, message: 'Student ID already exists.' }, { status: 409 });
    }

    const hashed = bcrypt.hashSync(id, 10);
    await run(
      `INSERT INTO students (id,password,name,department,year,section,cgpa,attendance,phone,email,batch,address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, hashed, name, department, year || 1, section || 'A', cgpa || 0, attendance || 0, phone || '', email || '', batch || '', address || '']
    );

    const deptClasses = await query<any>(`SELECT id FROM classes WHERE department = ?`, [department]);
    for (const c of deptClasses) {
      await run(`INSERT OR IGNORE INTO enrollments (student_id,class_id,group_name) VALUES (?,?,?)`, [
        id,
        c.id,
        `Group ${section || 'A'}`,
      ]);
    }

    await run(
      `INSERT INTO fees (student_id,semester,description,amount,paid,due_date,status) VALUES (?,?,?,?,?,?,?)`,
      [id, 'Current Sem', 'Tuition Fee', 80000, 0, `${new Date().getFullYear()}-09-15`, 'Pending']
    );

    const now = Date.now();
    await run(
      `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
      ['Admin@404', 'Admin', `New Student Enrolled: ${name}`, `${name} (${id}) has been enrolled in ${department}.`, 'students', now]
    );

    return NextResponse.json({ ok: true, message: 'Student added.', id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
