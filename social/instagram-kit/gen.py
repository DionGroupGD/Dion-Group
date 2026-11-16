# Builds the Instagram posts in the new dion-group.com style. Writes v2-*.html next to this file.
import os
HERE = os.path.dirname(os.path.abspath(__file__))

OK = '<div class="ok"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>'
PLUS = '<div class="gk-plus"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>'

def page(body):
    return ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base2.css"></head><body>\n'
            + body + '\n</body></html>\n')

def bar(i, total, light=False):
    return (f'<div class="bar"><span class="brand"><img src="../../favicon-512x512.png" alt="">Dion Group</span>'
            f'<span class="count">{i:02d} / {total:02d}</span></div>')

def mbp(img, w, style='', app='Axon'):
    return (f'<div class="mbp abs" style="width:{w}px;{style}"><div class="mbp-lid"><div class="mbp-scr">'
            f'<div class="mbp-menu"><b>{app}</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span><em>Tue 9:41</em></div>'
            f'<div class="view"><img src="../../tms/assets/{img}" alt=""></div></div></div><div class="mbp-base"></div></div>')

def iph(w, style='', img=None, bg='#fff', inner='', dark=False, fit=False):
    scr = f'<img class="scr{" fit" if fit else ""}" src="../../tms/assets/{img}" alt="">' if img else inner
    return (f'<div class="iph abs{" iph-dark" if dark else ""}" style="width:{w}px;{style}"><div class="iph-f"><div class="iph-s" style="background:{bg}">'
            f'<div class="iph-sb"><span>9:41</span><i></i></div>{scr}<i class="iph-hi"></i></div></div></div>')

def doc(img, w, style):
    return f'<div class="doc abs" style="width:{w}px;{style}"><img src="../../tms/assets/{img}" alt=""></div>'

def slide(cls, i, total, content, light=False):
    return f'<section class="slide {cls}">{bar(i, total, light)}{content}</section>'

# ───────────────────────── Post 1 · intro (5) ─────────────────────────
T = 5
p1 = []
p1.append(slide('dark', 1, T, '''
  <div style="margin-top:230px">
    <h1>We build our own software.<span class="and">And yours.</span></h1>
    <p class="sub" style="margin:44px auto 0">We make our own products, and build custom software, web apps, AI agents and websites for companies that want it done properly.</p>
  </div>
  <div class="hint abs" style="bottom:110px;left:0;right:0"><i></i>Swipe</div>'''))

p1.append(slide('dark', 2, T, '''
  <p class="n">Our own products · Axon TMS</p>
  <h2>One truck. Every desk aligned.</h2>
  <p class="sub">Axon runs the yard: gate, dock, documents and release in one place. Live today.</p>
  ''' + doc('checkin-approved-pdf.webp', 190, 'left:70px;top:840px;transform:rotate(-7deg)')
      + mbp('wallboard.webp', 760, 'left:150px;top:720px')
      + iph(196, 'right:96px;top:860px', img='public-slot-mobile.webp', bg='#f8dccf')))

AEGIS = '''
  <div class="abs" style="left:300px;top:760px;width:300px;height:300px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,rgba(120,190,255,.55),rgba(30,80,160,.35) 45%,rgba(10,20,40,.1) 70%);filter:blur(2px)"></div>
  <div class="abs" style="left:116px;top:760px;width:430px;height:520px">
    <div class="abs" style="inset:0;transform:translate(-24px,26px) rotate(-6deg);background:#d9d9de;border-radius:20px;opacity:.5"></div>
    <div class="abs" style="inset:0;transform:translate(-12px,13px) rotate(-3deg);background:#ececf0;border-radius:20px;opacity:.75"></div>
    <div class="abs" style="inset:0;background:#fbfbfd;color:#1d1d1f;border-radius:20px;padding:34px 32px;text-align:left;box-shadow:0 60px 120px rgba(0,0,0,.7);font-size:20px">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:28px;letter-spacing:.04em"><b>INVOICE</b><span style="color:#6e6e73;font-weight:600;font-size:22px">#2041</span></div>
      <p style="color:#6e6e73;margin:6px 0 26px">Dion Group · Greece</p>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid #e5e5ea"><span>Freight Athens → Munich</span><span>€1,400.00</span></div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid #e5e5ea"><span>Handling &amp; customs</span><span>€440.00</span></div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid #e5e5ea"><span>VAT 24%</span><span>included</span></div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid #e5e5ea"><span>Due date</span><span>30 Sep 2026</span></div>
      <div style="display:flex;justify-content:space-between;padding:18px 0 0;border-top:1px solid #e5e5ea;font-weight:700;font-size:28px"><span>Total</span><span>€1,840.00</span></div>
    </div>
  </div>
  <div class="abs" style="right:70px;top:830px;width:470px;padding:30px 32px;border-radius:26px;text-align:left;font-size:23px;
     background:rgba(28,30,36,.72);border:1.5px solid rgba(255,255,255,.12);box-shadow:0 50px 110px rgba(0,0,0,.7);backdrop-filter:blur(18px)">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px"><i style="width:16px;height:16px;border-radius:50%;background:#5ac8fa;box-shadow:0 0 14px #5ac8fa"></i><b style="font-size:24px">Aegis · extracted</b><span style="margin-left:auto;font-size:18px;color:#5ac8fa;background:rgba(90,200,250,.14);padding:5px 12px;border-radius:99px">In development</span></div>
    ''' + ''.join(f'<div style="display:flex;justify-content:space-between;padding:11px 0;border-top:1px solid rgba(255,255,255,.08)"><span style="color:#8e8e93">{k}</span><span>{v}</span></div>'
                  for k, v in [('Document', 'Invoice #2041'), ('Supplier', 'Dion Group'), ('Total', '€1,840.00'), ('VAT', '24% · included'), ('Due', '30 Sep 2026'), ('Route', 'Athens → Munich')]) + '''
    <div style="display:flex;justify-content:space-between;padding:11px 0 10px;border-top:1px solid rgba(255,255,255,.08)"><span style="color:#8e8e93">Confidence</span><span style="color:#30d158">98%</span></div>
    <div style="height:8px;border-radius:8px;background:rgba(255,255,255,.1)"><i style="display:block;width:98%;height:100%;border-radius:8px;background:var(--grad)"></i></div>
  </div>'''

p1.append(slide('dark', 3, T, '''
  <p class="n">Our own products · Aegis</p>
  <h2>Logistics intelligence.</h2>
  <p class="sub">Aegis reads invoices, CMRs and delivery notes, and turns them into checked, structured data. In development.</p>''' + AEGIS))

SERVICES = ['AI agents', 'AI chatbots', 'AI automation', 'Document processing', 'Product configurators', 'Quote calculators',
            'Custom software', 'Web applications', 'SaaS &amp; MVPs', 'Dashboards &amp; internal tools', 'Booking systems &amp; portals', 'Websites &amp; online shops']
p1.append(slide('light', 4, T, '''
  <p class="n">Custom software &amp; AI</p>
  <h2>If you can imagine it, we can build it.</h2>
  <p class="sub">Not sure yet what you need? That’s where we start. Tell us what slows you down.</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:66px;max-width:920px">''' +
  ''.join(f'<span style="padding:21px 33px;border-radius:99px;background:#fff;font-size:31px;font-weight:600;letter-spacing:-.015em;box-shadow:0 2px 14px rgba(0,0,0,.05)">{s}</span>' for s in SERVICES) +
  '</div>'))

p1.append(slide('light', 5, T, '''
  <p class="n">Let’s make it happen</p>
  <h2>What would you like to build?</h2>
  <div style="margin-top:56px;width:880px;text-align:left;border-top:1.5px solid var(--hair)">''' +
  ''.join(f'<div style="padding:30px 0;border-bottom:1.5px solid var(--hair)"><b style="display:block;font-size:34px;letter-spacing:-.015em;margin-bottom:8px">{a}</b><p style="font-size:29px;line-height:1.45;color:var(--text-dim)">{b}</p></div>'
          for a, b in [('Clear from the start.', 'Scope, price, ownership and support are agreed before we build.'),
                       ('We run our own software.', 'So we build yours the way we build ours: to be used every day.'),
                       ('Three languages, one team.', 'English, Deutsch, Ελληνικά. From the first call to launch day.')]) +
  '''</div>
  <div class="ctas"><span class="btn">Send us a message</span><span class="lnk">dion-group.com</span></div>'''))

# ───────────────────────── Post 2 · Axon (8) ─────────────────────────
T = 8
STEPS = ['Plan', 'Check-in', 'Approve', 'Gate', 'Dock', 'Documents']
def steps(on):
    return '<div class="pills">' + ''.join(f'<span class="{"on" if s == on else ""}">{s}</span>' for s in STEPS) + '</div>'

def axon_bar_slide(i, n, h, sub, on, devices):
    return slide('dark', i, T, f'<p class="n">{n}</p><h2>{h}</h2><p class="sub">{sub}</p>{steps(on)}{devices}')

p2 = []
p2.append(slide('dark', 1, T, '''
  <p class="n">Most truck yards still run on</p>
  <h2 style="font-size:96px">Phone calls. Paper. Queues at the window.</h2>
  <p class="sub">Axon TMS puts every truck on one live record. Swipe to see how.</p>''' +
  doc('checkin-approved-pdf.webp', 190, 'left:70px;top:860px;transform:rotate(-7deg)') +
  mbp('wallboard.webp', 760, 'left:150px;top:760px') +
  iph(196, 'right:96px;top:900px', img='public-slot-mobile.webp', bg='#f8dccf')))

p2.append(axon_bar_slide(2, '01 · Plan', 'The whole day, before it starts.',
  'Every load is planned before the gate opens, imported straight from your ERP. No retyping.', 'Plan',
  mbp('dashboard.webp', 860, 'left:110px;top:706px')))
p2.append(axon_bar_slide(3, '02 · Check-in', 'Drivers check themselves in.',
  'A QR code and their own phone. No app, no login. Axon confirms by email.', 'Check-in',
  iph(400, 'left:340px;top:740px', img='checkin.webp', bg='#f6e6e9')))
p2.append(axon_bar_slide(4, '03 · Approve', 'Approved in one click.',
  'Your team approves, and the driver gets the approval with a QR slip. No calls.', 'Approve',
  iph(400, 'left:340px;top:740px', img='checkin-email.webp', bg='#eef1f6', fit=True)))
p2.append(axon_bar_slide(5, '04 · Gate', 'Matched at the gate.',
  'Plate and container are checked against the plan, so the wrong truck never gets in.', 'Gate',
  mbp('gate.webp', 860, 'left:110px;top:706px')))
p2.append(axon_bar_slide(6, '05 · Dock', 'Dock calls and loading timers.',
  'One next step per load: call to dock, start loading, finish loading.', 'Dock',
  mbp('warehouse.webp', 860, 'left:110px;top:706px')))
p2.append(axon_bar_slide(7, '06 · Documents', 'Paperwork done. Truck released.',
  'A CMR checklist on every load, and release slips that go out automatically.', 'Documents',
  doc('checkin-approved-pdf.webp', 220, 'left:62px;top:780px;transform:rotate(-7deg)') + mbp('docs.webp', 800, 'left:180px;top:730px')))
p2.append(slide('dark', 8, T, '''
  <p class="n">Axon TMS</p>
  <h2>The whole yard, live.</h2>
  <p class="sub">Gate, warehouse and office see the same picture. Desk, wallboard and phone.</p>
  <div class="ctas" style="margin-top:40px"><span class="btn">Book a demo</span><span class="lnk">Link in bio</span></div>''' +
  mbp('wallboard.webp', 780, 'left:120px;top:800px') + iph(200, 'right:100px;top:920px', img='public-slot-mobile.webp', bg='#f8dccf')))

# ───────────────────────── Post 3 · Sound familiar? (8) ─────────────────────────
T = 8
def card(cls, k, h, p, vis, w=920, hgt=920):
    return (f'<div class="gk {cls}" style="width:{w}px;height:{hgt}px;margin-top:8px"><p class="gk-k">{k}</p><h3 class="gk-h">{h}</h3>'
            f'<p class="gk-p">{p}</p><div class="gk-vis">{vis}</div>{PLUS}</div>')

def how(t):
    return f'<p style="margin-top:38px;font-size:28px;line-height:1.45;color:var(--text-dim);max-width:860px"><b style="color:var(--text)">How it starts.</b> {t}</p>'

def fam(i, cls, k, h, p, vis, start):
    return slide('light', i, T, '<p class="n" style="margin-bottom:22px">Sound familiar?</p>' + card(cls, k, h, p, vis) + how(start))

VIS_PAPER = f'''<div style="position:absolute;left:58px;right:58px;bottom:120px;display:flex;flex-direction:column;gap:20px">
  <div style="align-self:flex-end;background:#0a84ff;color:#fff;font-size:28px;padding:18px 26px;border-radius:28px 28px 8px 28px">Read this and add it to accounts.</div>
  <div class="m" style="padding:28px 30px;display:flex;flex-direction:column;gap:16px">
    <div class="row"><div class="ic" style="background:#ffe9e6;color:#ff453a">PDF</div><div style="flex:1"><div style="font-size:29px;font-weight:700">Invoice #2041 · €1,840.00</div><div style="font-size:23px;color:var(--mdim);margin-top:4px">Due 30 Sep · VAT included · Dion Group</div></div></div>
    <div class="row" style="padding-top:16px;border-top:1.5px solid var(--mline)">{OK}<b style="font-size:28px;color:#1fae4f">Added to Payables</b><span style="margin-left:auto;font-size:23px;color:var(--mdim)">You only confirm</span></div>
  </div></div>'''

def flow_row(icbg, icfg, ic, t, last=False):
    return (f'<div class="row" style="padding:20px 0;{"" if last else "border-bottom:1.5px solid var(--mline)"}"><div class="ic" style="background:{icbg};color:{icfg}">{ic}</div>'
            f'<span style="font-size:29px;font-weight:600">{t}</span><span style="margin-left:auto">{OK}</span></div>')
VIS_FLOW = ('<div class="m" style="position:absolute;left:58px;right:58px;bottom:130px;padding:10px 30px">' +
  flow_row('rgba(10,132,255,.18)', '#5ac8fa', '@', 'New order email') + flow_row('rgba(47,211,167,.16)', '#2fd3a7', 'AI', 'AI reads the order') +
  flow_row('rgba(150,120,255,.18)', '#b4a2ff', '<span style="font-size:19px">ERP</span>', 'Order created in ERP') + flow_row('rgba(255,159,10,.16)', '#ffb340', '€', 'Invoice sent', True) + '</div>')

VIS_SHEET = '''<div style="position:absolute;left:58px;right:58px;bottom:130px;display:flex;align-items:center;gap:26px">
  <div class="m" style="width:230px;padding:28px 22px;text-align:center;transform:rotate(-4deg)">
    <div class="ic" style="background:#e3f6e8;color:#1d8a43;margin:0 auto;width:78px;height:78px">XLS</div>
    <div style="font-size:22px;font-weight:650;margin-top:16px;line-height:1.3">orders_<br>FINAL_v7.xlsx</div></div>
  <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#0071e3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  <div class="m" style="flex:1;padding:28px 30px">
    <div style="font-size:21px;color:var(--mdim);font-weight:600;letter-spacing:.06em;text-transform:uppercase">Orders · September</div>
    <div style="display:flex;align-items:baseline;gap:14px;margin-top:4px"><span style="font-size:62px;font-weight:700;letter-spacing:-.03em">3,482</span><span style="font-size:24px;font-weight:700;color:#1fae4f">+12.4%</span></div>
    <div style="display:flex;align-items:flex-end;gap:12px;height:140px;margin-top:14px">
      <i style="flex:1;height:40%;background:#cfe6ff;border-radius:8px"></i><i style="flex:1;height:55%;background:#cfe6ff;border-radius:8px"></i><i style="flex:1;height:48%;background:#cfe6ff;border-radius:8px"></i><i style="flex:1;height:70%;background:#9fd0ff;border-radius:8px"></i><i style="flex:1;height:64%;background:#9fd0ff;border-radius:8px"></i><i style="flex:1;height:88%;background:#0a84ff;border-radius:8px"></i>
    </div></div></div>'''

ORDER_APP = f'''<div class="app" style="color:#1d1d1f">
  <p style="font-size:4.6cqw;color:#0071e3;font-weight:700;letter-spacing:.08em">ORDER #4821</p>
  <p style="font-size:8.6cqw;font-weight:700;letter-spacing:-.03em;margin-top:2cqw;line-height:1.1">Arriving tomorrow</p>
  <p style="font-size:5cqw;color:#6e6e73;margin-top:1.5cqw">10:00–12:00</p>
  <div style="margin-top:7cqw;display:flex;flex-direction:column;gap:5cqw;font-size:5.4cqw;font-weight:600">
    <div class="row" style="gap:4cqw"><i style="width:7cqw;height:7cqw;border-radius:50%;background:#30d158"></i>Ordered</div>
    <div class="row" style="gap:4cqw"><i style="width:7cqw;height:7cqw;border-radius:50%;background:#30d158"></i>Packed</div>
    <div class="row" style="gap:4cqw;color:#0a84ff"><i style="width:7cqw;height:7cqw;border-radius:50%;background:#0a84ff;box-shadow:0 0 0 2cqw rgba(10,132,255,.18)"></i>On the way</div>
    <div class="row" style="gap:4cqw;color:#8e8e93"><i style="width:7cqw;height:7cqw;border-radius:50%;background:#e3e3e8"></i>Delivered</div>
  </div>
  <div style="margin-top:8cqw;height:34cqw;border-radius:5cqw;background:linear-gradient(160deg,#e9f4ff,#f4f7f8);position:relative;overflow:hidden">
    <svg viewBox="0 0 100 60" style="position:absolute;inset:0;width:100%;height:100%"><path d="M6 48 C 26 46, 30 22, 50 26 S 80 14, 94 10" fill="none" stroke="#2fd3a7" stroke-width="2.2" stroke-linecap="round"/><circle cx="50" cy="26" r="3" fill="#0a84ff"/></svg>
  </div></div>'''
VIS_ORDER = iph(330, 'left:50%;bottom:-240px;transform:translateX(-50%)', inner=ORDER_APP, bg='#fff')

SLOTS = ''.join(f'<div style="padding:3cqw 0;border-radius:3cqw;text-align:center;font-size:5cqw;font-weight:600;{st}">{t}</div>'
                for t, st in [('09:00', 'background:#f2f2f7'), ('09:45', 'background:#f2f2f7;color:#c7c7cc;text-decoration:line-through'), ('10:30', 'background:#f2f2f7'),
                              ('11:15', 'background:#0f766e;color:#fff'), ('12:00', 'background:#f2f2f7'), ('16:30', 'background:#f2f2f7')])
BOOK_APP = f'''<div class="app" style="color:#1d1d1f">
  <div class="row" style="gap:3.5cqw"><div style="width:11cqw;height:11cqw;border-radius:3cqw;background:#0f766e;color:#fff;display:grid;place-items:center;font-weight:700;font-size:5cqw">M</div>
    <div><p style="font-size:5.6cqw;font-weight:700">Meridian Dental</p><p style="font-size:4cqw;color:#6e6e73">Thessaloniki · Open today</p></div></div>
  <p style="font-size:4.2cqw;color:#6e6e73;margin-top:6cqw">Check-up &amp; cleaning · 45 min</p>
  <p style="font-size:5.6cqw;font-weight:700;margin-top:4cqw">Tuesday 23 September</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2.4cqw;margin-top:3.5cqw">{SLOTS}</div>
  <div style="margin-top:5cqw;padding:4cqw;border-radius:4cqw;background:#e9fbef"><p style="font-size:5cqw;font-weight:700;color:#11753a">You’re booked</p><p style="font-size:4cqw;color:#3c8a5a;margin-top:1cqw">Tue 23 Sep at 11:15. We’ll remind you the day before.</p></div>
</div>'''
VIS_BOOK = iph(330, 'left:50%;bottom:-200px;transform:translateX(-50%)', inner=BOOK_APP, bg='#fff')

VIS_WEB = '''<div style="position:absolute;left:58px;right:58px;bottom:120px;border-radius:26px;overflow:hidden;background:#fff;color:#1d1d1f;box-shadow:0 40px 90px rgba(0,0,0,.4)">
  <div style="display:flex;gap:10px;align-items:center;padding:16px 22px;background:#ececf0"><i style="width:15px;height:15px;border-radius:50%;background:#ff5f57"></i><i style="width:15px;height:15px;border-radius:50%;background:#febc2e"></i><i style="width:15px;height:15px;border-radius:50%;background:#28c840"></i><div style="margin-left:18px;flex:1;background:#fff;border-radius:10px;padding:7px 16px;font-size:19px;color:#6e6e73">yourcompany.com</div></div>
  <div style="padding:30px 36px 34px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:24px;font-weight:700;letter-spacing:-.02em">Your Company</span><span style="display:flex;gap:8px;font-size:18px;font-weight:700"><b style="padding:5px 11px;border-radius:8px;background:#1d1d1f;color:#fff">EN</b><b style="padding:5px 11px;border-radius:8px;background:#ececf0">DE</b><b style="padding:5px 11px;border-radius:8px;background:#ececf0">ΕΛ</b></span></div>
    <div style="font-size:44px;font-weight:700;letter-spacing:-.035em;line-height:1.05;margin-top:24px">Made in Greece.<br>Shipped across Europe.</div>
    <div style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:99px;background:#0071e3;color:#fff;font-size:20px;font-weight:600">Shop now</div>
  </div></div>'''

p3 = []
mini = lambda cls, k, h: (f'<div class="gk {cls}" style="flex:none;width:330px;height:470px;padding:34px 32px 0;border-radius:40px">'
                          f'<p class="gk-k" style="font-size:22px">{k}</p><h3 class="gk-h" style="font-size:36px">{h}</h3>'
                          f'<div class="gk-plus" style="width:52px;height:52px;right:24px;bottom:24px"><svg viewBox="0 0 24 24" style="width:26px;height:26px"><path d="M12 5v14M5 12h14"/></svg></div></div>')
p3.append(slide('light', 1, T, '''
  <p class="n">Custom software &amp; AI</p>
  <h1 style="font-size:132px">Sound familiar?</h1>
  <p class="sub">Six things that slow a business down, and the software that fixes each one.</p>
  <div style="position:absolute;left:80px;top:760px;display:flex;gap:22px">''' +
  mini('', 'Paperwork eats your day?', 'An AI assistant reads it for you.') +
  mini('dark', 'Typing the same data twice?', 'Let automations move it for you.') +
  mini('', 'Running on spreadsheets?', 'Turn them into your own app.') +
  '''</div>
  <div style="position:absolute;left:80px;right:80px;bottom:64px;display:flex;align-items:center;gap:20px">
    <div style="flex:none;width:240px;height:5px;border-radius:5px;background:rgba(0,0,0,.1)"><i style="display:block;width:17%;height:100%;border-radius:5px;background:#1d1d1f"></i></div>
    <span style="margin-left:auto;font-size:24px;color:var(--text-mute);font-weight:500">Swipe</span>
    <span style="width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,.08);display:grid;place-items:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
  </div>'''))
p3.append(fam(2, '', 'Paperwork eats your day?', 'An AI assistant reads it for you.',
  'Invoices, orders and forms arrive by email, and someone types them into your system by hand.', VIS_PAPER,
  'Send us a few real examples. We’ll show you what can be automated before anything is built.'))
p3.append(fam(3, 'dark', 'Typing the same data twice?', 'Let automations move it for you.',
  'The same order goes into email, a spreadsheet, the ERP and an invoice, by hand, every time.', VIS_FLOW,
  'Walk us through one process. We’ll map every step and show what can run by itself.'))
p3.append(fam(4, '', 'Running on spreadsheets?', 'Turn them into your own app.',
  'Orders, stock and customers live in files called FINAL_v7, and only one person knows how they work.', VIS_SHEET,
  'Share the spreadsheet. We’ll show you what it looks like as software.'))
p3.append(fam(5, 'dark', 'Customers calling for updates?', 'Let them check for themselves.',
  '“Where’s my order?” Asked by phone, answered by someone who has to go and find out.', VIS_ORDER,
  'Tell us which question you’re asked most. That’s where the portal begins.'))
p3.append(fam(6, '', 'Bookings by phone?', 'Online booking, day and night.',
  'The phone rings mid-task, times get double-booked, and nobody remembers to send a reminder.', VIS_BOOK,
  'Tell us how you take bookings today. We’ll keep what works.'))
p3.append(fam(7, 'grad', 'Need to be found online?', 'Websites and shops, done properly.',
  'Your website is slow, hard to update, or doesn’t show up when customers search.', VIS_WEB,
  'Send us your current site, or a site you like. We’ll take it from there.'))
p3.append(slide('light', 8, T, '''
  <div style="margin-top:170px">
    <p class="gk-k" style="font-size:36px;color:var(--text-mute)">Not sure what you need?</p>
    <h1 style="margin-top:18px;font-size:112px">We’ll map it with you first.</h1>
    <p class="sub" style="margin:40px auto 0">Just describe your day. No brief, no jargon needed.</p>
    <div class="ctas" style="margin-top:64px"><span class="btn">Send us a message</span><span class="lnk">dion-group.com</span></div>
  </div>'''))

# ───────────────────────── Extras: Reel frame, Reel cover, highlights, profile ─────────────────────────
ex = []
ex.append('''<section class="reel dark" data-name="reel-frame.png">
  <div style="position:absolute;top:250px;left:0;right:0;text-align:center;padding:0 60px">
    <p class="n">Our own products · Axon TMS</p>
    <h2 style="font-size:84px">One truck.<br>Every desk aligned.</h2>
  </div>
  <div style="position:absolute;left:0;top:656px;width:1080px;height:608px;background:#000"></div>
  <div class="pills" style="position:absolute;top:1320px;left:120px;right:120px;margin:0"><span>No app for drivers</span><span>One record per truck</span><span class="on">Live today</span></div>
</section>''')
ex.append('<section class="reel dark" data-name="reel-cover.png"><div style="position:absolute;top:320px;left:0;right:0;text-align:center;padding:0 70px">'
          '<p class="n">Axon TMS · 80-second tour</p><h1 style="font-size:116px">A truck yard without paper.</h1>'
          '<p class="lnk" style="margin-top:34px;display:flex;align-items:center;justify-content:center;gap:14px">'
          '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#5ac8fa" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M10 8.5v7l6-3.5z" fill="#5ac8fa" stroke="none"/></svg>Watch the film</p></div>' +
          doc('checkin-approved-pdf.webp', 200, 'left:66px;top:960px;transform:rotate(-7deg)') +
          mbp('wallboard.webp', 780, 'left:150px;top:860px') +
          iph(206, 'right:90px;top:1010px', img='public-slot-mobile.webp', bg='#f8dccf') + '</section>')

def hl(name, inner):
    return (f'<section class="hl dark" data-name="{name}" style="display:grid;place-items:center">'
            f'<div style="width:640px;height:640px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.08),rgba(255,255,255,.015));border:2px solid rgba(255,255,255,.12)">{inner}</div></section>')
ICON = lambda d: f'<svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">{d}</svg>'
ex.append(hl('highlight-axon.png', '<img src="../../tms/assets/axon-tile.png" style="width:300px;filter:invert(1)" alt="">'))
ex.append(hl('highlight-services.png', ICON('<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>')))
ex.append(hl('highlight-aegis.png', ICON('<path d="M12 2.8 4.5 5.6v6.1c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V5.6L12 2.8Z"/><path d="M8.6 12.2l2.4 2.4 4.4-4.8"/>')))
ex.append(hl('highlight-work-with-us.png', ICON('<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.2"/>')))
ex.append('<section class="pp" data-name="profile-picture.png"><img src="../../favicon-512x512.png" style="width:640px" alt=""></section>')

for name, parts in [('v2-post1-intro', p1), ('v2-post2-axon', p2), ('v2-post3-problems', p3), ('v2-extras', ex)]:
    open(os.path.join(HERE, name + '.html'), 'w').write(page('\n'.join(parts)))
print('ok')
