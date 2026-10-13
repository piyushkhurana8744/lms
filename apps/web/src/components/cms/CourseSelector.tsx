'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import { BookOpen, Plus, Trash2, ArrowUp, ArrowDown, Search, Check, Loader2 } from 'lucide-react';

export interface CourseSelectorProps {
  selectedCourseIds: string[];
  onChange: (courseIds: string[]) => void;
}

export function CourseSelector({ selectedCourseIds, onChange }: CourseSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Query tenant published courses
  const { data, isLoading } = useQuery({
    queryKey: ['cms-course-selector', search],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses?status=PUBLISHED&visibility=PUBLIC&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    },
    enabled: isModalOpen
  });

  // Query selected courses details
  const { data: selectedCoursesData } = useQuery({
    queryKey: ['cms-selected-courses', selectedCourseIds],
    queryFn: async () => {
      if (selectedCourseIds.length === 0) return [];
      const promises = selectedCourseIds.map(async (id) => {
        const res = await fetch(`/api/v1/courses/${id}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
      });
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    },
    enabled: selectedCourseIds.length > 0
  });

  const availableCourses: any[] = data?.data || [];
  const selectedCourses: any[] = selectedCoursesData || [];

  const handleAdd = (courseId: string) => {
    if (!selectedCourseIds.includes(courseId)) {
      onChange([...selectedCourseIds, courseId]);
    }
  };

  const handleRemove = (courseId: string) => {
    onChange(selectedCourseIds.filter((id) => id !== courseId));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIds = [...selectedCourseIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;
    onChange(newIds);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-[var(--brand-text)]">Featured Courses Selection</h4>
          <p className="text-[11px] text-[var(--text-muted)]">Select and arrange published public courses to display on the homepage.</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-[#BE1E2E]" /> Add Course
        </Button>
      </div>

      {/* Selected Course List */}
      {selectedCourseIds.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-[var(--brand-border)] rounded-xl space-y-2 bg-[var(--bg-surface-elevated)]">
          <BookOpen className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-60" />
          <p className="text-xs font-semibold text-[var(--brand-text)]">No featured courses selected</p>
          <p className="text-[11px] text-[var(--text-muted)]">Click &quot;Add Course&quot; above to select published courses for your homepage.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedCourseIds.map((courseId, idx) => {
            const course = selectedCourses.find((c) => (c.id || c._id) === courseId);
            return (
              <div
                key={courseId}
                className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-3 hover:border-[#BE1E2E]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-center font-mono font-bold text-[11px] text-[var(--text-muted)] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h5 className="font-extrabold text-xs text-[var(--brand-text)] truncate">
                      {course ? course.title : `Course (${courseId})`}
                    </h5>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                      {course?.category?.name || 'Published Course'} • {course?.level || 'All Levels'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--brand-background)] disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === selectedCourseIds.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--brand-background)] disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(courseId)}
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[80vh] text-[var(--brand-text)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <h3 className="font-extrabold text-sm">Select Course to Feature</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-xs">
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search published courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#BE1E2E]" /> Loading courses...
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">No published courses found</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableCourses.map((course) => {
                  const courseId = course.id || course._id;
                  const isSelected = selectedCourseIds.includes(courseId);
                  return (
                    <button
                      key={courseId}
                      type="button"
                      onClick={() => {
                        if (isSelected) handleRemove(courseId);
                        else handleAdd(courseId);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E]'
                          : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{course.title}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{course.category || 'Course'} • {course.level || 'All Levels'}</div>
                      </div>

                      {isSelected ? (
                        <Check className="w-4 h-4 text-[#BE1E2E]" />
                      ) : (
                        <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-[var(--brand-border)] flex justify-end">
              <Button type="button" variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
