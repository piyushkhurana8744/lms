'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CourseCurriculumBuilder } from '@/components/curriculum/CourseCurriculumBuilder';

export default function AdminCourseCurriculumPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return <CourseCurriculumBuilder courseId={courseId} />;
}
