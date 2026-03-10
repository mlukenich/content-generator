import { DashboardStats } from './DashboardService';

export function renderDashboard(stats: DashboardStats): string {
  const videoRows = stats.recentVideos.map(v => `
    <tr class="border-b border-gray-700 hover:bg-gray-800 transition">
      <td class="py-4 px-4 font-medium text-gray-200">${v.title}</td>
      <td class="py-4 px-4">
        <span class="px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(v.status)}">
          ${v.status}
        </span>
      </td>
      <td class="py-4 px-4 text-gray-400">${v.nicheSlug}</td>
      <td class="py-4 px-4 text-gray-400">${(v.estimatedCostCents / 100).toFixed(2)}</td>
      <td class="py-4 px-4 text-right">
        ${v.videoUrl ? `<a href="${v.videoUrl}" target="_blank" class="text-blue-400 hover:underline">View</a>` : '-'}
      </td>
    </tr>
  `).join('');

  const scheduleRows = stats.activeSchedules.map(s => `
    <div class="bg-gray-900 border border-gray-700 p-4 rounded-lg flex justify-between items-center mb-2">
      <div>
        <p class="font-bold text-blue-400 uppercase text-xs tracking-tighter">${s.id}</p>
        <p class="text-sm text-white">${s.cron}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-gray-500 uppercase">Next Run</p>
        <p class="text-xs font-semibold text-gray-300">${s.nextRun}</p>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NovaContent — Factory Monitor</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; }
      </style>
    </head>
    <body class="p-8">
      <div class="max-w-6xl mx-auto">
        <header class="flex justify-between items-center mb-12">
          <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">NovaContent</h1>
            <p class="text-gray-400">Factory Monitor & Production Metrics</p>
          </div>
          <div class="flex gap-4">
            <button onclick="window.location.reload()" class="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition">Refresh</button>
            <a href="/admin/queues" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition">BullMQ Board</a>
          </div>
        </header>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <p class="text-sm text-gray-400 mb-1 uppercase tracking-wider">Total Videos</p>
            <p class="text-4xl font-bold text-white">${stats.totalVideos}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <p class="text-sm text-gray-400 mb-1 uppercase tracking-wider">Total Production Cost</p>
            <p class="text-4xl font-bold text-green-400">$${(stats.totalCostCents / 100).toFixed(2)}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <p class="text-sm text-gray-400 mb-1 uppercase tracking-wider">Success Rate</p>
            <p class="text-4xl font-bold text-blue-400">${stats.successRate}%</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <p class="text-sm text-gray-400 mb-1 uppercase tracking-wider">Linked Platforms</p>
            <div class="flex gap-2 mt-2">
              ${stats.activePlatforms.length > 0 ? stats.activePlatforms.map(p => `
                <span class="bg-gray-700 px-2 py-1 rounded text-xs text-white">${p}</span>
              `).join('') : '<span class="text-gray-500 italic">None</span>'}
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Recent Jobs (Left 2/3) -->
          <div class="lg:col-span-2">
            <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
              <div class="p-6 border-b border-gray-700">
                <h2 class="text-xl font-bold">Recent Production Jobs</h2>
              </div>
              <table class="w-full text-left border-collapse">
                <thead class="bg-gray-900/50 text-xs uppercase text-gray-500 tracking-widest">
                  <tr>
                    <th class="py-3 px-4 font-semibold">Title</th>
                    <th class="py-3 px-4 font-semibold">Status</th>
                    <th class="py-3 px-4 font-semibold">Niche</th>
                    <th class="py-3 px-4 font-semibold">Unit Cost</th>
                    <th class="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${videoRows || '<tr><td colspan="5" class="py-12 text-center text-gray-500 italic">No jobs processed yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Automation Sidebar (Right 1/3) -->
          <div class="lg:col-span-1">
            <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-2xl">
              <h2 class="text-xl font-bold mb-6">Automation Schedules</h2>
              ${scheduleRows || '<p class="text-gray-500 italic text-sm">No recurring schedules active.</p>'}
              
              <div class="mt-8 pt-6 border-t border-gray-700">
                <h3 class="text-sm font-bold uppercase text-gray-500 mb-4">Add Schedule</h3>
                <form onsubmit="event.preventDefault(); addSchedule()" class="space-y-4">
                  <input id="nicheSlug" type="text" placeholder="niche-slug" class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white">
                  <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-bold transition">Activate Automation</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <script>
          async function addSchedule() {
            const nicheSlug = document.getElementById('nicheSlug').value;
            const res = await fetch('/admin/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nicheSlug })
            });
            if (res.ok) window.location.reload();
            else alert('Failed to schedule: ' + (await res.text()));
          }
        </script>

        <footer class="mt-12 text-center text-gray-500 text-sm">
          NovaContent Engine v1.0.0 — Stable Production Branch
        </footer>
      </div>
    </body>
    </html>
  `;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'published': return 'bg-green-900/30 text-green-400 border border-green-800';
    case 'completed': return 'bg-blue-900/30 text-blue-400 border border-blue-800';
    case 'rendering': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800';
    case 'error': return 'bg-red-900/30 text-red-400 border border-red-800';
    default: return 'bg-gray-700 text-gray-300';
  }
}
