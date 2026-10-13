import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes upload timeout limit
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('accessToken')?.value;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      headers['Cookie'] = `accessToken=${accessToken}`;
    }

    // Also forward any existing Authorization header from request
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    if (!headers['Authorization'] && !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ERR_UNAUTHORIZED',
            message: 'Authentication token missing'
          }
        },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

    const apiRes = await fetch(`${apiUrl}/api/v1/media/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERR_UPLOAD_FAILED',
          message: err.message || 'Media upload failed'
        }
      },
      { status: 500 }
    );
  }
}
