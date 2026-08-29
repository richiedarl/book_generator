/**
 * Admin User Management API
 * Allows admins to list, update, and delete users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getAllUsersApp, getUserByIdApp, updateUserApp, deleteUserApp, generateAccessToken } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const users = getAllUsersApp();
    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('Admin users GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Prevent admin from removing their own admin status
    if (userId === user.id && updates.isAdmin === false) {
      return NextResponse.json(
        { error: 'Cannot remove your own admin status' },
        { status: 400 }
      );
    }

    const targetUser = getUserByIdApp(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate access token if user is being made admin
    if (updates.isAdmin && !targetUser.isAdmin) {
      updates.accessToken = generateAccessToken();
    }

    // Remove access token if admin status is being removed
    if (updates.isAdmin === false) {
      updates.accessToken = undefined;
    }

    const updated = updateUserApp(userId, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (err: any) {
    console.error('Admin user PATCH error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const deleted = deleteUserApp(userId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin user DELETE error:', err);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}