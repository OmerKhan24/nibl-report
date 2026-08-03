import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

function getHeaders(req: NextRequest) {
  const token = req.headers.get('x-clickup-token') || process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error('Unauthorized: ClickUp Token is missing');
  }
  return {
    'Authorization': token.trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export async function GET(req: NextRequest) {
  try {
    const headers = getHeaders(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'user') {
      const res = await fetch(`${CLICKUP_BASE}/user`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `ClickUp Error: ${res.statusText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'teams') {
      const res = await fetch(`${CLICKUP_BASE}/team`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `ClickUp Error: ${res.statusText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'spaces') {
      const teamId = searchParams.get('teamId');
      if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
      const res = await fetch(`${CLICKUP_BASE}/team/${teamId}/space`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `ClickUp Error: ${res.statusText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'lists') {
      const spaceId = searchParams.get('spaceId');
      if (!spaceId) return NextResponse.json({ error: 'Missing spaceId' }, { status: 400 });

      // Fetch folderless lists and folders in parallel
      const [folderlessRes, foldersRes] = await Promise.all([
        fetch(`${CLICKUP_BASE}/space/${spaceId}/list`, { headers }),
        fetch(`${CLICKUP_BASE}/space/${spaceId}/folder`, { headers })
      ]);

      let lists: any[] = [];

      if (folderlessRes.ok) {
        const folderlessData = await folderlessRes.json();
        if (folderlessData.lists) {
          lists = lists.concat(folderlessData.lists.map((l: any) => ({
            id: l.id,
            name: l.name,
            folderName: null,
            statuses: l.statuses || [],
          })));
        }
      }

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        const folders = foldersData.folders || [];
        
        // Fetch lists for all folders in parallel
        const folderListsPromises = folders.map(async (folder: any) => {
          try {
            const fRes = await fetch(`${CLICKUP_BASE}/folder/${folder.id}/list`, { headers });
            if (fRes.ok) {
              const fData = await fRes.json();
              return (fData.lists || []).map((l: any) => ({
                id: l.id,
                name: l.name,
                folderName: folder.name,
                statuses: l.statuses || [],
              }));
            }
          } catch (err) {
            console.error(`Error fetching lists for folder ${folder.id}`, err);
          }
          return [];
        });

        const allFolderLists = await Promise.all(folderListsPromises);
        allFolderLists.forEach(fl => {
          lists = lists.concat(fl);
        });
      }

      return NextResponse.json({ lists });
    }

    if (action === 'tasks') {
      const listId = searchParams.get('listId');
      if (!listId) return NextResponse.json({ error: 'Missing listId' }, { status: 400 });

      const res = await fetch(`${CLICKUP_BASE}/list/${listId}/task?archived=false`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `ClickUp Error: ${res.statusText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('ClickUp API handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const headers = getHeaders(req);
    const body = await req.json();
    const { listId, name, description, status, priority, dueDate, assignees } = body;

    if (!listId) return NextResponse.json({ error: 'Missing listId' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Missing task name' }, { status: 400 });

    const payload: any = {
      name,
      description: description || '',
    };

    if (status) payload.status = status;
    if (priority) payload.priority = priority;
    if (dueDate) payload.due_date = dueDate;
    if (assignees && Array.isArray(assignees)) payload.assignees = assignees;

    const res = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `ClickUp Error: ${res.statusText} - ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('ClickUp POST handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const headers = getHeaders(req);
    const body = await req.json();
    const { taskId, status, priority, name, description, dueDate, assignees } = body;

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    const payload: any = {};
    if (status !== undefined) payload.status = status;
    if (priority !== undefined) payload.priority = priority;
    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (dueDate !== undefined) payload.due_date = dueDate;
    if (assignees !== undefined && Array.isArray(assignees)) payload.assignees = assignees;

    const res = await fetch(`${CLICKUP_BASE}/task/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `ClickUp Error: ${res.statusText} - ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('ClickUp PUT handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
