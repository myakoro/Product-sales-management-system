"use client";

import React from "react";

interface DateNavigatorProps {
    date: string; // YYYY-MM
    onChange: (date: string) => void;
    label?: string;
    className?: string;
}

export default function DateNavigator({ date, onChange, label, className = "" }: DateNavigatorProps) {
    const handlePrev = () => {
        const d = new Date(date + "-01");
        d.setMonth(d.getMonth() - 1);
        onChange(d.toISOString().slice(0, 7));
    };

    const handleNext = () => {
        const d = new Date(date + "-01");
        d.setMonth(d.getMonth() + 1);
        onChange(d.toISOString().slice(0, 7));
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {label && <span className="text-lg font-semibold text-rinori-navy mr-1">{label}</span>}
            <button
                onClick={handlePrev}
                className="p-2 px-4 border-2 border-rinori-navy text-rinori-navy rounded-md hover:bg-rinori-navy hover:text-white font-bold bg-white transition-all duration-200"
                title="前月へ"
            >
                &lt;
            </button>
            <input
                type="month"
                value={date}
                onChange={(e) => onChange(e.target.value)}
                className="px-4 py-2 border-2 border-neutral-200 rounded-md text-center min-w-[140px] text-lg font-medium focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
            />
            <button
                onClick={handleNext}
                className="p-2 px-4 border-2 border-rinori-navy text-rinori-navy rounded-md hover:bg-rinori-navy hover:text-white font-bold bg-white transition-all duration-200"
                title="翌月へ"
            >
                &gt;
            </button>
        </div>
    );
}
