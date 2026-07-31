import { v4 as uuidv4 } from 'uuid'
import { db } from './index'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

const seedData = [
  { company: 'Acme Corp', role: 'Senior Frontend Engineer', status: 'interview_2', appliedDate: daysAgo(45), lastUpdated: today, source: 'linkedin', location: 'San Francisco, CA', workMode: 'hybrid', salaryMin: 140000, salaryMax: 180000, url: 'https://acme.com/jobs/1', contactName: 'Jane Smith', notes: 'Great culture, referral from a friend.' },
  { company: 'Globex', role: 'React Developer', status: 'screening', appliedDate: daysAgo(20), lastUpdated: today, source: 'job_board', location: 'Remote', workMode: 'remote', salaryMin: 120000, salaryMax: 150000, url: null, contactName: null, notes: null },
  { company: 'Initech', role: 'Full Stack Engineer', status: 'applied', appliedDate: daysAgo(5), lastUpdated: today, source: 'company_site', location: 'Austin, TX', workMode: 'onsite', salaryMin: null, salaryMax: null, url: 'https://initech.com/careers', contactName: null, notes: null },
  { company: 'Umbrella Ltd', role: 'TypeScript Engineer', status: 'rejected', appliedDate: daysAgo(60), lastUpdated: daysAgo(40), source: 'linkedin', location: 'New York, NY', workMode: 'hybrid', salaryMin: 150000, salaryMax: 200000, url: null, contactName: 'Bob Jones', notes: 'Got to final round but lost to internal candidate.' },
  { company: 'Stark Industries', role: 'UI Engineer', status: 'offer', appliedDate: daysAgo(38), lastUpdated: today, source: 'referral', location: 'Los Angeles, CA', workMode: 'remote', salaryMin: 160000, salaryMax: 190000, url: 'https://stark.io/jobs', contactName: 'Tony M.', notes: 'Offer received! Negotiating.' },
  { company: 'Wayne Enterprises', role: 'Frontend Lead', status: 'withdrawn', appliedDate: daysAgo(55), lastUpdated: daysAgo(50), source: 'recruiter', location: 'Gotham City', workMode: 'onsite', salaryMin: 175000, salaryMax: 210000, url: null, contactName: 'Alfred P.', notes: 'Withdrew after accepting another offer.' },
  { company: 'Pied Piper', role: 'React Native Developer', status: 'applied', appliedDate: daysAgo(2), lastUpdated: today, source: 'linkedin', location: 'Palo Alto, CA', workMode: 'hybrid', salaryMin: 130000, salaryMax: 160000, url: null, contactName: null, notes: null },
  { company: 'Hooli', role: 'Software Engineer III', status: 'screening', appliedDate: daysAgo(14), lastUpdated: today, source: 'job_board', location: 'Mountain View, CA', workMode: 'hybrid', salaryMin: 145000, salaryMax: 185000, url: 'https://hooli.com/jobs', contactName: 'HR Team', notes: null },
  { company: 'Dunder Mifflin Tech', role: 'Frontend Engineer', status: 'applied', appliedDate: daysAgo(8), lastUpdated: today, source: 'company_site', location: 'Scranton, PA', workMode: 'remote', salaryMin: null, salaryMax: null, url: null, contactName: null, notes: null },
  { company: 'Los Pollos', role: 'Web Engineer', status: 'interview_3', appliedDate: daysAgo(30), lastUpdated: today, source: 'referral', location: 'Albuquerque, NM', workMode: 'onsite', salaryMin: 110000, salaryMax: 140000, url: null, contactName: 'Gustavo F.', notes: 'Third interview scheduled next week.' },
  { company: 'Wernham Hogg', role: 'React Developer', status: 'applied', appliedDate: daysAgo(1), lastUpdated: today, source: 'linkedin', location: 'Remote', workMode: 'remote', salaryMin: 125000, salaryMax: 155000, url: null, contactName: null, notes: null },
  // Ghosted: status 'applied' but lastUpdated > 30 days ago — ghosted state is derived in the UI
  { company: 'Vandelay Industries', role: 'Senior UI Engineer', status: 'applied', appliedDate: daysAgo(75), lastUpdated: daysAgo(35), source: 'job_board', location: 'New York, NY', workMode: 'hybrid', salaryMin: 140000, salaryMax: 170000, url: null, contactName: null, notes: 'No response after 2 follow-ups.' },
  { company: 'Prestige Worldwide', role: 'Frontend Developer', status: 'accepted', appliedDate: daysAgo(90), lastUpdated: daysAgo(60), source: 'recruiter', location: 'Miami, FL', workMode: 'remote', salaryMin: 135000, salaryMax: 165000, url: null, contactName: 'Brennan H.', notes: 'Accepted! Starting next month.' },
  { company: 'Bluth Company', role: 'JavaScript Engineer', status: 'rejected', appliedDate: daysAgo(42), lastUpdated: daysAgo(30), source: 'company_site', location: 'Newport Beach, CA', workMode: 'onsite', salaryMin: null, salaryMax: null, url: null, contactName: null, notes: null },
  { company: 'Sterling Cooper', role: 'Tech Lead', status: 'interview_1', appliedDate: daysAgo(22), lastUpdated: today, source: 'referral', location: 'New York, NY', workMode: 'hybrid', salaryMin: 170000, salaryMax: 220000, url: 'https://sterlingcooper.com/tech', contactName: 'Don D.', notes: 'Strong referral, feeling good about this one.' },
] as const

// Clear existing data
db.exec('DELETE FROM application_events')
db.exec('DELETE FROM applications')

const insertApp = db.prepare(`
  INSERT INTO applications
    (id, company, role, status, applied_date, last_updated, source,
     location, work_mode, salary_min, salary_max, url, contact_name, notes, deleted_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
`)

const insertEvent = db.prepare(`
  INSERT INTO application_events (id, application_id, from_status, to_status, changed_at)
  VALUES (?, ?, NULL, ?, ?)
`)

for (const app of seedData) {
  const id = uuidv4()
  insertApp.run(
    id,
    app.company,
    app.role,
    app.status,
    app.appliedDate,
    app.lastUpdated,
    app.source,
    app.location,
    app.workMode,
    app.salaryMin,
    app.salaryMax,
    app.url,
    app.contactName,
    app.notes,
  )
  insertEvent.run(uuidv4(), id, app.status, app.appliedDate)
}

console.log(`Seeded ${seedData.length} applications`)
