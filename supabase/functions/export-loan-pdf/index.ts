import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function fmt(val: any, fallback = '—') {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
}

function fmtMoney(val: any) {
  if (val === null || val === undefined) return '—';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(val: any) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtBool(val: any) {
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  return '—';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const app = await req.json();
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pageW - margin * 2;
    let y = 50;

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        y = 50;
      }
    };

    // ── Header ──────────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Crestwell Travel Services', margin, y);
    y += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text('Travel Financing Application', margin, y);
    y += 12;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 20;

    // ── Application Info ────────────────────────────────
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Application Details', margin, y);
    y += 16;

    const infoRows: [string, string][] = [
      ['Application #', fmt(app.application_number)],
      ['Status', fmt(app.status)?.toUpperCase()],
      ['Submitted', fmtDate(app.created_at)],
      ['Loan Amount Requested', fmtMoney(app.loan_amount_requested)],
      ['Purpose', fmt(app.loan_purpose)],
      ['Trip Description', fmt(app.trip_description)],
      ['Travel Date', fmtDate(app.travel_date)],
      ['Down Payment', fmtMoney(app.down_payment)],
      ['Preferred Term', app.preferred_term_months ? `${app.preferred_term_months} months` : '—'],
    ];

    doc.setFontSize(9);
    for (const [label, value] of infoRows) {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 150, y);
      y += 14;
    }

    // ── Section helper ──────────────────────────────────
    const section = (title: string) => {
      y += 10;
      checkPage(30);
      doc.setDrawColor(220);
      doc.line(margin, y, pageW - margin, y);
      y += 16;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(title, margin, y);
      y += 16;
      doc.setFontSize(9);
    };

    const row = (label: string, value: string) => {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 150, y);
      y += 14;
    };

    // ── Personal Information ────────────────────────────
    section('Personal Information');
    row('Name', `${fmt(app.first_name)} ${fmt(app.last_name)}`);
    row('Date of Birth', fmtDate(app.date_of_birth));
    row('SSN (last 4)', fmt(app.ssn_last_four));
    row('Email', fmt(app.email));
    row('Phone', fmt(app.phone));
    if (app.alt_phone) row('Alt Phone', fmt(app.alt_phone));

    // ── Address ─────────────────────────────────────────
    section('Address');
    row('Street', `${fmt(app.address_line1)}${app.address_line2 ? ', ' + app.address_line2 : ''}`);
    row('City / State / Zip', `${fmt(app.city)}, ${fmt(app.state)} ${fmt(app.zip_code)}`);
    row('Housing Status', fmt(app.housing_status));
    row('Years at Address', fmt(app.years_at_address));

    // ── Employment & Income ─────────────────────────────
    section('Employment & Income');
    row('Employment Status', fmt(app.employment_status));
    row('Employer', fmt(app.employer_name));
    row('Job Title', fmt(app.job_title));
    row('Years Employed', fmt(app.years_employed));
    row('Monthly Income', fmtMoney(app.monthly_income));
    if (app.other_income) {
      row('Other Income', fmtMoney(app.other_income));
      row('Other Income Source', fmt(app.other_income_source));
    }

    // ── Monthly Obligations ─────────────────────────────
    section('Monthly Obligations');
    row('Rent / Mortgage', fmtMoney(app.monthly_rent_mortgage));
    row('Car Payment', fmtMoney(app.monthly_car_payment));
    row('Other Debt', fmtMoney(app.monthly_other_debt));

    // ── Financial Profile ───────────────────────────────
    section('Financial Profile');
    row('Checking Account', fmtBool(app.checking_account));
    row('Savings Account', fmtBool(app.savings_account));
    row('Bankruptcy History', fmtBool(app.bankruptcy_history));
    if (app.bankruptcy_history && app.bankruptcy_details) {
      row('Bankruptcy Details', fmt(app.bankruptcy_details));
    }

    // ── References ──────────────────────────────────────
    section('References');
    row('Reference 1', `${fmt(app.reference1_name)} (${fmt(app.reference1_relation)}) — ${fmt(app.reference1_phone)}`);
    row('Reference 2', `${fmt(app.reference2_name)} (${fmt(app.reference2_relation)}) — ${fmt(app.reference2_phone)}`);

    // ── Decision (if approved/denied) ───────────────────
    if (app.status === 'approved' || app.status === 'denied' || app.status === 'funded') {
      section('Decision');
      row('Decision Date', fmtDate(app.decision_date));
      if (app.approved_amount) row('Approved Amount', fmtMoney(app.approved_amount));
      if (app.approved_rate) row('Approved Rate', `${app.approved_rate}%`);
      if (app.approved_term_months) row('Approved Term', `${app.approved_term_months} months`);
      if (app.decision_notes) row('Decision Notes', fmt(app.decision_notes));
    }

    // ── Consent & Signature ─────────────────────────────
    section('Consent & Signature');
    row('Credit Check Consent', fmtBool(app.consent_credit_check));
    row('Terms Consent', fmtBool(app.consent_terms));
    row('Autopay Consent', fmtBool(app.consent_autopay));
    row('E-Signature', fmt(app.esignature));
    row('Signed At', fmtDate(app.signed_at));

    // ── Agent Notes ─────────────────────────────────────
    if (app.agent_notes) {
      section('Agent Notes');
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(app.agent_notes, contentW);
      for (const line of lines) {
        checkPage(14);
        doc.text(line, margin, y);
        y += 14;
      }
    }

    // ── Footer ──────────────────────────────────────────
    y += 20;
    checkPage(30);
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generated ${new Date().toLocaleString('en-US')} · Crestwell Travel Services · Confidential`, margin, y);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${app.application_number || 'loan-application'}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('export-loan-pdf error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
