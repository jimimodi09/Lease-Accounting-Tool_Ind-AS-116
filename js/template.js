/* ── template.js ── */
'use strict';
const Template = (() => {
  const C = {
    navyBg:'FF0284C7',navyFg:'FFFFFFFF',tealBg:'FF0EA5E9',tealFg:'FFFFFFFF',
    goldBg:'FFE0F2FE',goldFg:'FF0369A1',alt1:'FFF0F9FF',alt2:'FFFFFFFF',
    border:'FFBAE6FD',reqBg:'FFFFF1F2',reqFg:'FFB91C1C',optBg:'FFF0FDF4',
    optFg:'FF166534',secBg:'FFEFF6FF',secFg:'FF1E40AF',inputBg:'FFFFFDE7',
    warnBg:'FFFFF3CD',mutedFg:'FF64748B',textMain:'FF0F172A',textMid:'FF334155',
  };
  const FONT='Calibri', NUM_INR='"₹"#,##0.00';
  const tb=()=>({top:{style:'thin',color:{argb:C.border}},bottom:{style:'thin',color:{argb:C.border}},left:{style:'thin',color:{argb:C.border}},right:{style:'thin',color:{argb:C.border}}});
  const sc=(cell,{bg,fg,bold=false,size=10,italic=false,wrap=false,hAlign='left',vAlign='middle',numFmt,border=true}={})=>{
    cell.font={name:FONT,bold,size,italic,color:{argb:fg||C.textMain}};
    if(bg)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:bg}};
    cell.alignment={horizontal:hAlign,vertical:vAlign,wrapText:wrap};
    if(border)cell.border=tb();
    if(numFmt)cell.numFmt=numFmt;
  };
  // Excel date serial helper
  const exSer=(y,m,d)=>Math.round((new Date(y,m-1,d)-new Date(1899,11,30))/86400000);

  // Sheet 1 row positions (1-indexed)
  // R1:title R2:subtitle R3:banner R4:blank R5:colhdr
  // R6:sec1 R7:name R8:startDate R9:endDate R10:term
  // R11:blank R12:sec2 R13:amount R14:freq R15:timing R16:ibr
  // R17:blank R18:sec3 R19:idc R20:incentives R21:restoration R22:residual R23:fystart R24:opening
  // R25:footer
  const ROW={startDate:8,endDate:9,freq:14,timing:15,fyStart:23};
  // Cross-sheet references used in Sheet2 formulas
  const SN="'Lease Inputs'";
  const SR=`${SN}!$B$${ROW.startDate}`;   // start date ref
  const ER=`${SN}!$B$${ROW.endDate}`;     // end date ref
  const FR=`${SN}!$B$${ROW.freq}`;        // frequency ref
  const TR=`${SN}!$B$${ROW.timing}`;      // timing ref
  const INTV=`IF(${FR}="monthly",1,IF(${FR}="quarterly",3,IF(${FR}="halfyearly",6,12)))`;
  // Payment date formula for period i (1-indexed)
  const dateFml=(i)=>
    `=IF(OR(${SR}="",${ER}=""),"",`+
    `IF(${TR}="beginning",`+
    `EDATE(DATE(YEAR(${SR}),MONTH(${SR}),1),(${INTV})*(${i}-1)),`+
    `EOMONTH(${SR},(${INTV})*${i}-1)))`;

  const buildPeriodRows=(ctx)=>{
    if(!ctx||!ctx.leaseStart||!ctx.leaseEnd)return[];
    const sd=Utils.parseDate(ctx.leaseStart),ed=Utils.parseDate(ctx.leaseEnd);
    if(!sd||!ed||ed<=sd)return[];
    const termMonths=Utils.monthsBetween(sd,ed),freq=ctx.frequency||'monthly',timing=ctx.timing||'end',pmt=ctx.payment||0;
    return Calculator.generatePaymentDates(sd,freq,timing,termMonths).map((pd,i)=>({period:i+1,date:Utils.toDateStr(pd.date),payment:pmt}));
  };

  const downloadExcel=async(ctx)=>{
    if(typeof ExcelJS==='undefined'){alert('ExcelJS not loaded.');return;}
    const wb=new ExcelJS.Workbook();
    wb.creator='CA Jimi R Modi – Ind AS 116 Lease Accounting Tool';
    wb.created=wb.modified=new Date();
    const safeName=(ctx&&ctx.leaseName)?ctx.leaseName.replace(/[^a-zA-Z0-9_]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''):'Lease';

    /* ════ SHEET 1 — LEASE INPUTS ════ */
    const ws1=wb.addWorksheet('Lease Inputs',{tabColor:{argb:'FF0EA5E9'}});
    ws1.columns=[{width:42},{width:30},{width:12},{width:62}];

    const addRow1=(vals,height=20)=>{const r=ws1.addRow(vals);r.height=height;return r;};
    const mergeStyle=(row,nCols,opts)=>{ws1.mergeCells(row.number,1,row.number,nCols);sc(row.getCell(1),opts);};

    // Title rows
    mergeStyle(addRow1(['IND AS 116 – LEASE ACCOUNTING INPUT TEMPLATE','','',''],32),4,{bg:C.navyBg,fg:C.navyFg,bold:true,size:14,border:false});
    mergeStyle(addRow1([`CA JIMI R MODI · Practicing Chartered Accountant · ${Utils.toDateStr(new Date())}`, '', '', ''],18),4,{bg:C.tealBg,fg:C.tealFg,size:9,italic:true,border:false});
    mergeStyle(addRow1(['📝  Fill Column B only. Dates: use calendar picker or type DD-MM-YYYY. Dropdowns: click cell and select from list.','','',''],22),4,{bg:C.warnBg,fg:'FF92400E',bold:true,size:9,border:false});
    addRow1([]);
    const hdr=addRow1(['FIELD NAME','VALUE  ← Enter here','REQUIRED?','NOTES & INSTRUCTIONS'],22);
    [1,2,3,4].forEach(c=>sc(hdr.getCell(c),{bg:C.navyBg,fg:C.navyFg,bold:true,size:10,hAlign:c===2?'center':'left'}));
    ws1.views=[{state:'frozen',ySplit:5}];

    let ri=0;
    const addSec=(label)=>{
      const r=addRow1([label,'','',''],20);
      ws1.mergeCells(r.number,1,r.number,4);
      sc(r.getCell(1),{bg:C.secBg,fg:C.secFg,bold:true,size:9});
    };
    const addField=(field,value,notes,req,type)=>{
      const r=addRow1([field,value,req?'✔ Yes':'Optional',notes],22); ri++;
      const bg=ri%2===0?C.alt1:C.alt2;
      sc(r.getCell(1),{bg,fg:C.textMid,size:10});
      sc(r.getCell(2),{bg:C.inputBg,fg:C.navyBg,bold:true,size:10});
      if(type==='amount'&&value!=='')r.getCell(2).numFmt=NUM_INR;
      sc(r.getCell(3),{bg:req?C.reqBg:C.optBg,fg:req?C.reqFg:C.optFg,bold:true,size:9,hAlign:'center'});
      sc(r.getCell(4),{bg,fg:C.mutedFg,size:9,italic:true,wrap:true});
    };

    // Section 1 – Lease Details
    addSec('  📋  SECTION 1 — LEASE DETAILS');
    addField('Lease Name / Asset Description','','e.g. Office Premises – Mumbai',true,'text');
    addField('Lease Start Date','','Click cell for date picker or type DD-MM-YYYY',true,'date');
    addField('Lease End Date','','Click cell for date picker or type DD-MM-YYYY',true,'date');
    addField('Lease Term (months)','','Auto-calculated from dates, or enter manually',false,'number');
    addRow1([]); ri++;

    // Section 2 – Payment Parameters
    addSec('  💰  SECTION 2 — PAYMENT PARAMETERS');
    addField('Lease Payment Amount (₹)','','Base periodic payment (₹)',true,'amount');
    addField('Payment Frequency','monthly','Select from dropdown: monthly | quarterly | halfyearly | yearly',true,'freq');
    addField('Payment Timing','end','Select from dropdown: end | beginning',true,'timing');
    addField('Incremental Borrowing Rate (% p.a.)','','e.g. 10.5 — IBR per Ind AS 116 Para 26',true,'number');
    addRow1([]); ri++;

    // Section 3 – Optional
    addSec('  ⚙️  SECTION 3 — OPTIONAL ADJUSTMENTS (enter 0 if not applicable)');
    addField('Initial Direct Costs (₹)','0','Legal fees, brokerage etc. (Para 24(a))',false,'amount');
    addField('Lease Incentives Received (₹)','0','Deducted from ROU asset (Para 24(b))',false,'amount');
    addField('Restoration / Dismantling Costs (₹)','0','Estimated restoration cost (Para 24(d))',false,'amount');
    addField('Residual Value Guarantee (₹)','0','Added to last payment for PV calculation',false,'amount');
    addField('Financial Year Start (Month)','April','Select from dropdown: April | January | July | October',false,'fystart');
    addField('Opening Lease Liability (₹)','','For Ind AS 116 transition only — leave blank for fresh computation',false,'amount');

    // Footer
    const ftr=addRow1(['© CA Jimi R Modi — Ind AS 116 Lease Accounting Tool. For professional use only.','','',''],18);
    ws1.mergeCells(ftr.number,1,ftr.number,4);
    sc(ftr.getCell(1),{bg:C.navyBg,fg:C.navyFg,size:8,italic:true,hAlign:'center',border:false});

    // ── Data Validations ──
    // Date picker for Start Date (B8) and End Date (B9)
    [ROW.startDate,ROW.endDate].forEach((rowNum,i)=>{
      const cell=ws1.getCell(`B${rowNum}`);
      cell.numFmt='DD-MM-YYYY';
      cell.dataValidation={
        type:'date',operator:'between',
        formulae:[exSer(2000,1,1),exSer(2099,12,31)],
        showInputMessage:true,
        promptTitle:i===0?'Lease Start Date':'Lease End Date',
        prompt:'Click to open calendar picker, or type manually as DD-MM-YYYY (e.g. 01-04-2024)',
        showErrorMessage:false,  // allow manual text entry without blocking error
      };
    });
    // Frequency dropdown
    ws1.getCell(`B${ROW.freq}`).dataValidation={
      type:'list',allowBlank:false,showErrorMessage:true,
      formulae:['"monthly,quarterly,halfyearly,yearly"'],
      errorTitle:'Invalid',error:'Choose: monthly | quarterly | halfyearly | yearly',
    };
    // Timing dropdown
    ws1.getCell(`B${ROW.timing}`).dataValidation={
      type:'list',allowBlank:false,showErrorMessage:true,
      formulae:['"end,beginning"'],
      errorTitle:'Invalid',error:'Choose: end (last day) or beginning (first day)',
    };
    // FY Start dropdown — month names for user-friendliness; upload.js maps name→number
    ws1.getCell(`B${ROW.fyStart}`).dataValidation={
      type:'list',allowBlank:false,showErrorMessage:true,
      formulae:['"April,January,July,October"'],
      errorTitle:'Invalid',error:'Select a month from the dropdown list',
    };

    /* ════ SHEET 2 — PAYMENT SCHEDULE ════ */
    const ws2=wb.addWorksheet('Payment Schedule',{tabColor:{argb:'FF0284C7'}});
    ws2.columns=[{width:10},{width:28},{width:28},{width:42}];

    // Banner
    const s2b=ws2.addRow(['📅  PAYMENT SCHEDULE  |  Dates update automatically from Sheet 1 (Lease Inputs).  |  Edit PAYMENT AMOUNT only (Column C — yellow).','','','']);
    s2b.height=28;ws2.mergeCells(1,1,1,4);
    sc(s2b.getCell(1),{bg:C.tealBg,fg:C.tealFg,bold:true,size:9,wrap:true,border:false});

    // Column headers
    const s2h=ws2.addRow(['PERIOD #','PAYMENT DATE (auto-updated)','PAYMENT AMOUNT (₹)  ← Edit here','NOTES']);
    s2h.height=22;
    [1,2,3,4].forEach(c=>sc(s2h.getCell(c),{bg:C.navyBg,fg:C.navyFg,bold:true,size:10,hAlign:'center'}));
    ws2.views=[{state:'frozen',ySplit:2}];
    ws2.autoFilter={from:'A2',to:'D2'};

    // Generate up to 120 rows (covers yearly 10yr lease)
    const periodRows=buildPeriodRows(ctx);
    const nPeriods=periodRows.length>0?periodRows.length:60;
    const S2_START=3;

    for(let i=1;i<=nPeriods;i++){
      const r=ws2.addRow([i,{formula:dateFml(i)},periodRows[i-1]?periodRows[i-1].payment:'','']);
      r.height=18;
      const bg=i%2===0?C.alt1:C.alt2;
      sc(r.getCell(1),{bg,fg:C.mutedFg,size:10,hAlign:'center'});
      sc(r.getCell(2),{bg,fg:C.textMain,size:10,hAlign:'center',numFmt:'DD-MM-YYYY'});
      sc(r.getCell(3),{bg:C.inputBg,fg:C.navyBg,bold:true,size:10,hAlign:'right',numFmt:NUM_INR});
      sc(r.getCell(4),{bg,fg:C.mutedFg,size:9,italic:true});
    }
    // Total row
    const s2last=S2_START+nPeriods-1;
    const s2tot=ws2.addRow(['','TOTAL',{formula:`=IFERROR(SUM(C${S2_START}:C${s2last}),"")`},'']);
    s2tot.height=22;
    sc(s2tot.getCell(1),{bg:C.goldBg,fg:C.goldFg,bold:true,hAlign:'center'});
    sc(s2tot.getCell(2),{bg:C.goldBg,fg:C.goldFg,bold:true,hAlign:'center'});
    sc(s2tot.getCell(3),{bg:C.goldBg,fg:C.goldFg,bold:true,hAlign:'right',numFmt:NUM_INR});
    sc(s2tot.getCell(4),{bg:C.goldBg,fg:C.goldFg});

    /* ════ SHEET 3 — HOW TO USE ════ */
    const ws3=wb.addWorksheet('How To Use',{tabColor:{argb:'FF7C3AED'}});
    ws3.columns=[{width:105}];
    const addI=(text,style='body')=>{
      const r=ws3.addRow([text]);
      if(style==='title'){r.height=30;sc(r.getCell(1),{bg:C.navyBg,fg:C.navyFg,bold:true,size:13,border:false});}
      else if(style==='sec'){r.height=22;sc(r.getCell(1),{bg:C.tealBg,fg:C.tealFg,bold:true,size:10,border:false});}
      else if(style==='sub'){r.height=20;sc(r.getCell(1),{bg:C.secBg,fg:C.secFg,bold:true,size:10,border:false});}
      else if(style==='tip'){r.height=18;sc(r.getCell(1),{bg:C.optBg,fg:C.optFg,size:9,italic:true,wrap:true,border:false});}
      else if(style==='warn'){r.height=20;sc(r.getCell(1),{bg:C.reqBg,fg:C.reqFg,bold:true,size:9,wrap:true,border:false});}
      else if(style==='blank'){r.height=10;sc(r.getCell(1),{bg:C.alt2,border:false});}
      else{r.height=18;sc(r.getCell(1),{bg:C.alt1,fg:C.textMain,size:10,wrap:true,border:false});}
    };
    addI('IND AS 116 – LEASE ACCOUNTING TOOL  |  Upload Guide','title');
    addI('Developed by CA Jimi R Modi, Practicing Chartered Accountant','body');
    addI('','blank');
    addI('📋  SHEET 1 — LEASE INPUTS','sec');
    addI('  • Fill Column B (VALUE) only. Never edit Column A (field names).','body');
    addI('  • DATES — Click the cell to open a calendar picker, or type directly as DD-MM-YYYY (e.g. 01-04-2024).','body');
    addI('  • DROPDOWNS — Click the cell to see a dropdown list: Payment Frequency, Timing, FY Start Month.','body');
    addI('  • Required fields (✔ Yes) must be filled. Optional fields default to 0.','body');
    addI('  • IBR: enter as a number e.g. 10.5 for 10.5% per annum.','body');
    addI('  💡 Tip: After filling Sheet 1, go to Sheet 2 — dates auto-populate instantly.','tip');
    addI('','blank');
    addI('📅  SHEET 2 — PAYMENT SCHEDULE','sec');
    addI('  • Payment dates are formula-driven — they update automatically when you change Sheet 1 dates or frequency.','body');
    addI('  • Edit only Column C (Payment Amount, highlighted yellow). Leave blank to use base amount from Sheet 1.','body');
    addI('  • Total row at the bottom auto-sums all payments.','body');
    addI('  ⚠  Do NOT edit the date column (Column B) — it is auto-calculated from Sheet 1.','warn');
    addI('','blank');
    addI('⬆️  HOW TO UPLOAD','sec');
    addI('  1. Fill Sheet 1 required fields. Sheet 2 dates populate automatically.','body');
    addI('  2. Edit payment amounts in Sheet 2 Column C if payments vary period to period.','body');
    addI('  3. Save as .xlsx and upload to the Ind AS 116 Tool (drag-drop or Browse File).','body');
    addI('  4. Review loaded values, then click ⚡ Compute Lease Schedules.','body');
    addI('','blank');
    addI('© CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool','title');

    /* ════ SHEET 4 — DISCLAIMER ════ */
    const wsD=wb.addWorksheet('Disclaimer',{tabColor:{argb:'FF7B341E'}});
    wsD.columns=[{width:110}];
    const dRow=(text,style)=>{
      const r=wsD.addRow([text]);
      if(style==='title'){r.height=30;const c=r.getCell(1);c.font={name:FONT,bold:true,size:14,color:{argb:C.navyFg}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF7B341E'}};c.alignment={vertical:'middle',horizontal:'left'};}
      else if(style==='sub'){r.height=18;const c=r.getCell(1);c.font={name:FONT,size:9,italic:true,color:{argb:C.navyFg}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.tealBg}};c.alignment={vertical:'middle'};}
      else if(style==='warn'){r.height=28;const c=r.getCell(1);c.font={name:FONT,bold:true,size:10,color:{argb:'FF92400E'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF8E1'}};c.border={left:{style:'thick',color:{argb:'FFF59E0B'}}};c.alignment={vertical:'middle',wrapText:true};}
      else if(style==='hdr'){r.height=20;const c=r.getCell(1);c.font={name:FONT,bold:true,size:10,color:{argb:C.navyFg}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.navyBg}};c.alignment={vertical:'middle'};}
      else if(style==='body'){r.height=54;const c=r.getCell(1);c.font={name:FONT,size:10,color:{argb:C.textMid}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.alt1}};c.alignment={vertical:'top',wrapText:true};}
      else{r.height=10;}
      return r;
    };
    dRow('DISCLAIMER & TERMS OF USE','title');
    dRow('Ind AS 116 Lease Accounting Tool  |  CA Jimi R Modi — Practicing Chartered Accountant','sub');
    wsD.addRow([]);
    dRow('⚠  IMPORTANT: Please read this disclaimer carefully before using this tool. Use of this tool constitutes your acceptance of the following terms and conditions.','warn');
    wsD.addRow([]);
    const CLAUSES=[
      ['1. General Purpose','This Lease Accounting Tool has been developed by CA Jimi R Modi, Practicing Chartered Accountant, solely for general guidance and educational reference purposes in relation to the accounting treatment of leases under Indian Accounting Standard 116 (Ind AS 116). The Tool is intended to assist users in understanding and performing preliminary lease accounting computations only.'],
      ['2. Not a Substitute for Professional Advice','The outputs generated by this Tool do not constitute professional accounting, legal, financial, or tax advice. Every lease arrangement has unique facts and circumstances. Users are strongly advised to consult a qualified Chartered Accountant before making any accounting decisions, financial disclosures, or regulatory filings based on the results of this Tool.'],
      ['3. Limitation of Liability','CA Jimi R Modi, and any associates or contributors, shall not be held liable for any direct, indirect, incidental, consequential, or special loss or damage arising out of or in connection with the use of, or reliance upon, the information or computations generated by this Tool, including but not limited to errors, omissions, or misinterpretation of Ind AS 116 provisions.'],
      ['4. User Responsibility','The user assumes full and sole responsibility for verifying the accuracy of all inputs entered into the Tool and for validating all outputs against applicable standards and circulars issued by the Ministry of Corporate Affairs (MCA). The user is solely responsible for all decisions made based on results generated by this Tool.'],
      ['5. Accuracy & Updates','While reasonable care has been taken in designing this Tool based on Ind AS 116 as currently in force, no warranty or representation is made as to completeness, accuracy, or reliability. Accounting standards may be subject to amendments and the Tool may not reflect such subsequent changes.'],
      ['6. No Client-Professional Relationship','Use of this Tool does not create or imply any client-professional relationship between the user and CA Jimi R Modi. The outputs shall not be construed as an opinion, certification, or attestation by CA Jimi R Modi in any professional capacity.'],
      ['7. Intellectual Property','This Tool, including its design, logic, and structure, is the intellectual property of CA Jimi R Modi. Reproduction, redistribution, or commercial use of this Tool without prior written permission is strictly prohibited.'],
    ];
    CLAUSES.forEach(([h,b])=>{dRow(h,'hdr');dRow(b,'body');wsD.addRow([]);});
    dRow('© CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool','sub');

    /* ════ DOWNLOAD ════ */
    try{
      const buf=await wb.xlsx.writeBuffer();
      const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      const a=Object.assign(document.createElement('a'),{href:url,download:`IndAS116_${safeName}_Input_Template.xlsx`});
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(e){console.error(e);alert('Template download failed: '+e.message);downloadCSV();}
  };

  const downloadCSV=()=>{
    const ROWS=[
      ['Lease Name / Asset Description','','Yes','e.g. Office Premises – Mumbai'],
      ['Lease Start Date','','Yes','DD-MM-YYYY e.g. 01-04-2024'],
      ['Lease End Date','','Yes','DD-MM-YYYY e.g. 31-03-2029'],
      ['Lease Term (months)','','Optional','Auto-calculated'],
      ['Lease Payment Amount (₹)','','Yes','Base periodic payment'],
      ['Payment Frequency','monthly','Yes','monthly|quarterly|halfyearly|yearly'],
      ['Payment Timing','end','Yes','end|beginning'],
      ['Incremental Borrowing Rate (% p.a.)','','Yes','e.g. 10.5'],
      ['Initial Direct Costs (₹)','0','Optional',''],
      ['Lease Incentives Received (₹)','0','Optional',''],
      ['Restoration / Dismantling Costs (₹)','0','Optional',''],
      ['Residual Value Guarantee (₹)','0','Optional',''],
      ['Financial Year Start (Month)','4','Optional','4=April 1=January'],
      ['Opening Lease Liability (₹)','','Optional','For transition only'],
    ];
    const lines=['"FIELD","VALUE","REQUIRED","NOTES"'];
    ROWS.forEach(r=>lines.push(r.map(c=>`"${c}"`).join(',')));
    const blob=new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:'IndAS116_Lease_Template.csv'});
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  const buildPeriodRows_export=buildPeriodRows;
  return{downloadExcel,downloadCSV,buildPeriodRows:buildPeriodRows_export};
})();
