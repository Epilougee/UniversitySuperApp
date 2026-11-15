import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ myId: string; myRole: string }> }) {
  try {
    const { myId, myRole } = await params;
    let contacts: any[] = [];

    if (myRole === 'Student') {
      const selfRows = await query<any>(`SELECT department, year FROM students WHERE id = ?`, [myId]);
      const myDept = selfRows.length ? selfRows[0].department : null;

      const teachers = await query<any>(`
        SELECT DISTINCT t.id, t.name, t.designation as role_label, 'Teacher' as role
        FROM teachers t
        JOIN classes c ON c.teacher_id = t.id
        JOIN enrollments e ON e.class_id = c.id
        WHERE e.student_id = ?
      `, [myId]);

      const peers = myDept
        ? await query<any>(`
          SELECT id, name, (department || ' · Year ' || year) as role_label, 'Student' as role
          FROM students
          WHERE id != ? AND department = ?
          ORDER BY name
        `, [myId, myDept])
        : [];

      const admins = await query<any>(`SELECT id, name, 'Administrator' as role_label, 'Admin' as role FROM admins`);
      contacts = [...teachers, ...peers, ...admins];
    } else if (myRole === 'Teacher') {
      const students = await query<any>(`
        SELECT DISTINCT s.id, s.name, s.department as role_label, 'Student' as role
        FROM students s
        JOIN enrollments e ON e.student_id = s.id
        JOIN classes c ON c.id = e.class_id
        WHERE c.teacher_id = ?
      `, [myId]);
      const admins = await query<any>(`SELECT id, name, 'Administrator' as role_label, 'Admin' as role FROM admins`);
      contacts = [...students, ...admins];
    } else if (myRole === 'Admin') {
      const students = await query<any>(`SELECT id, name, department as role_label, 'Student' as role FROM students ORDER BY name`);
      const teachers = await query<any>(`SELECT id, name, designation as role_label, 'Teacher' as role FROM teachers ORDER BY name`);
      contacts = [...teachers, ...students];
    }

    return NextResponse.json({ ok: true, contacts });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
