"use client";

import React from "react";

interface PeriodNavigatorProps {
    startYm: string;
    endYm: string;
    onChange: (start: string, end: string) => void;
    className?: string;
}

export default function PeriodNavigator({ startYm, endYm, onChange, className = "" }: PeriodNavigatorProps) {
    const calculateNextPeriod = (start: string, end: string, direction: 1 | -1) => {
        const startDate = new Date(start + "-01");
        const endDate = new Date(end + "-01");

        // Shift amount: Requirement is now "always shift by 1 month"
        const shiftMonth = direction;

        const newStart = new Date(startDate);
        newStart.setMonth(newStart.getMonth() + shiftMonth);

        const newEnd = new Date(endDate);
        newEnd.setMonth(newEnd.getMonth() + shiftMonth);

        return {
            start: newStart.toISOString().slice(0, 7), // YYYY-MM
            end: newEnd.toISOString().slice(0, 7)
        };
    };

    const handlePrev = () => {
        const { start, end } = calculateNextPeriod(startYm, endYm, -1);
        onChange(start, end);
    };

    const handleNext = () => {
        const { start, end } = calculateNextPeriod(startYm, endYm, 1);
        onChange(start, end);
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={handlePrev}
                className="p-2 px-4 border-2 border-rinori-navy text-rinori-navy rounded-md hover:bg-rinori-navy hover:text-white font-bold bg-white transition-all duration-200"
                title="前の期間へ"
            >
                &lt;
            </button>
            <div className="flex items-center gap-2">
                <input
                    type="month"
                    value={startYm}
                    onChange={(e) => onChange(e.target.value, endYm)}
                    className="px-4 py-2 border-2 border-neutral-200 rounded-md font-medium focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                />
                <span className="text-neutral-500 font-semibold">〜</span>
                <input
                    type="month"
                    value={endYm}
                    onChange={(e) => onChange(startYm, e.target.value)}
                    className="px-4 py-2 border-2 border-neutral-200 rounded-md font-medium focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                />
            </div>
            <button
                onClick={handleNext}
                className="p-2 px-4 border-2 border-rinori-navy text-rinori-navy rounded-md hover:bg-rinori-navy hover:text-white font-bold bg-white transition-all duration-200"
                title="次の期間へ"
            >
                &gt;
            </button>
        </div>
    );
}
