import ExcelJS from 'exceljs';
import { NextResponse, type NextRequest } from 'next/server';
import { currentTeacher } from '@/lib/auth';
import { parseFilter, queryRecords } from '@/lib/records';
import { hm } from '@/lib/time';

const HEADER = ['날짜', '학생', '학년', '강의', '등원', '하원', '체류', '상태'];

// 현재 필터 결과 전체를 내보낸다(페이지와 무관).
export async function GET(req: NextRequest) {
  if (!(await currentTeacher())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const filter = parseFilter(sp);
  const data = queryRecords(filter).map(r => [
    r.date, r.name, r.grade, r.course, r.inT ?? '', r.outT ?? '', r.stayMin == null ? '' : hm(r.stayMin), r.status,
  ]);
  const base = `출결기록_${filter.from}_${filter.to}`;

  if (sp.format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('출결 기록');
    ws.addRow(HEADER).font = { bold: true };
    ws.addRows(data);
    ws.columns.forEach((c, i) => { c.width = [12, 10, 6, 18, 8, 8, 8, 10][i]; });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, { headers: download(`${base}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') });
  }

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  // 엑셀에서 한글이 깨지지 않도록 BOM을 붙인다.
  const csv = '﻿' + [HEADER, ...data].map(r => r.map(esc).join(',')).join('\r\n');
  return new NextResponse(csv, { headers: download(`${base}.csv`, 'text/csv; charset=utf-8') });
}

function download(filename: string, type: string) {
  return {
    'Content-Type': type,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  };
}
