import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch all tax rates
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const taxRates = await prisma.taxRate.findMany({
            orderBy: {
                startYm: 'desc',
            },
        });

        return NextResponse.json(taxRates);
    } catch (error: any) {
        console.error('Error fetching tax rates:', error);
        return NextResponse.json({ error: 'Failed to fetch tax rates' }, { status: 500 });
    }
}

// POST: Create a new tax rate
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { startYm, rate } = body;

        // Validation
        if (!startYm || typeof rate !== 'number') {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Validate YYYY-MM format
        if (!/^\d{4}-\d{2}$/.test(startYm)) {
            return NextResponse.json({ error: 'Invalid format. Use YYYY-MM' }, { status: 400 });
        }

        const newRate = await prisma.taxRate.create({
            data: {
                startYm,
                rate,
            },
        });

        return NextResponse.json(newRate);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Tax rate for this period already exists' }, { status: 409 });
        }
        console.error('Error creating tax rate:', error);
        return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
    }
}

// DELETE: Delete a tax rate
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.taxRate.delete({
            where: {
                id: parseInt(id),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting tax rate:', error);
        return NextResponse.json({ error: 'Failed to delete tax rate' }, { status: 500 });
    }
}
