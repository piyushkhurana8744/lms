'use client';

import React from 'react';
import { CourseCard, PublicCourseItem } from './CourseCard';

export function CourseGrid({ courses }: { courses: PublicCourseItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
