import axios from 'axios';
import * as core from '@actions/core'

/**
 * Options for notifying about old branches in a repository.
 *
 * @param repo - The name of the repository where the branches are located.
 * @param affectedBranches - An object mapping branch names to their respective last commit dates.
 * @param workflowUrl - The URL of the workflow associated with the notification process.
 * @param token - The authentication token used for accessing the repository or related services.
 */

interface NotifyOldBranchesOptions {
  repo: string;
  affectedBranches: { [branchName: string]: string };
  workflowUrl: string;
  token: string;
}

function groupBranchesByUser(branchMap: { [branch: string]: string }): { [user: string]: string[] } {
  const grouped: { [user: string]: string[] } = {};

  for (const [branch, user] of Object.entries(branchMap)) {
    if (!grouped[user]) {
      grouped[user] = [];
    }
    grouped[user].push(branch);
  }

  return grouped;
}

function buildMessage(repo: string, branches: string[]): string {
  const listItems = branches.map(branch => `<li>${branch}</li>`).join('');

  return `
<h1>⚠️ You have old branches in repo <strong>${repo}</strong></h1>
<p>Please consider removing the following stale branches:</p>
<ul>
  ${listItems}
</ul>`;
}

async function sendMessage(recipient: string, message: string, url: string, token: string): Promise<void> {
  const payload = {
    recipient,
    old_branches: message,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    core.info(`✅ Notified ${recipient}: ${response.status}`);
  } catch (error: any) {
    core.error(`❌ Failed to notify ${recipient}: ${error.message}`);
  }
}

export async function notifyOldBranches(options: NotifyOldBranchesOptions): Promise<void> {
  const grouped = groupBranchesByUser(options.affectedBranches);

  for (const [user, branches] of Object.entries(grouped)) {
    const recipient = `${user}@bosch.com`;
    const message = buildMessage(options.repo, branches);

    await sendMessage(recipient, message, options.workflowUrl, options.token);
  }
}
