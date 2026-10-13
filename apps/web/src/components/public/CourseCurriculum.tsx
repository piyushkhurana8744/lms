'use client';

import React from 'react';
import { PublicCurriculum, PublicModuleItem } from './PublicCurriculum';

export type PublicLesson = PublicModuleItem['lessons'][number];
export type PublicModule = PublicModuleItem;

export function CourseCurriculum({
  courseSlug = '',
  modules
}: {
  courseSlug?: string;
  modules: PublicModuleItem[];
}) {
  return <PublicCurriculum courseSlug={courseSlug} modules={modules} />;
}
