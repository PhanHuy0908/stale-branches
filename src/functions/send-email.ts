import nodemailer from 'nodemailer'

/**
 * Options for notifying about old branches in a repository.
 *
 * @param repo - The name of the repository where the branches are located.
 * @param affectedBranches - An object mapping branch names to their respective last commit dates.
 * @param sender - The URL of the workflow associated with the notification process.
 * @param password - The authentication token used for accessing the repository or related services.
 */

interface EmailOldBranchesOptions {
  repo: string
  affectedBranches: {[branchName: string]: string}
  sender: string
  password: string
}

function groupBranchesByUser(branchMap: {[branch: string]: string}): {[user: string]: string[]} {
  const grouped: {[user: string]: string[]} = {}

  for (const [branch, user] of Object.entries(branchMap)) {
    if (!grouped[user]) {
      grouped[user] = []
    }
    grouped[user].push(branch)
  }

  return grouped
}

function buildMessage(repo: string, branches: string[]): string {
  const listItems = branches.map(branch => `<li>${branch}</li>`).join('')

  return `
<h1>⚠️ You have old branches in repo <strong>${repo}</strong></h1>
<p>Please consider removing the following stale branches:</p>
<ul>
  ${listItems}
</ul>`
}

async function sendInternalEmail(senderEmail: string, password: string, receiverEmail: string, subject: string, body: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'rb-smtp-auth.rbesz01.com',
      port: 25,
      secure: false,
      auth: {
        user: senderEmail,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: senderEmail,
      to: receiverEmail,
      subject: subject,
      text: body
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent:', info.response)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

export async function emailOldBranches(options: EmailOldBranchesOptions): Promise<void> {
  const grouped = groupBranchesByUser(options.affectedBranches)

  for (const [user, branches] of Object.entries(grouped)) {
    const recipient = `${user}@bosch.com`
    const message = buildMessage(options.repo, branches)

    await sendInternalEmail(options.sender, options.password, recipient, 'Need your action for the old branches', message)
  }
}
