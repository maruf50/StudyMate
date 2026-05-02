export type Proficiency = "beginner" | "intermediate" | "advanced";
export type AvailabilitySlot = {
    day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    startHour: number;
    endHour: number;
};
export type InterestInput = {
    topic: string;
    level: Proficiency;
};
