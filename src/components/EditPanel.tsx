import { useState, useEffect } from 'react';
import type { LandscapeProject, Bucket } from '../types';

interface EditPanelProps {
  project: LandscapeProject;
  editingBucket: { categoryId: string; bucketId: string } | null;
  editingCategory: string | null;
  onUpdateBucket: (categoryId: string, bucketId: string, updates: Partial<Bucket>) => void;
  onRemoveBucket: (categoryId: string, bucketId: string) => void;
  onUpdateCategory: (categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onAddBucket: (categoryId: string, title: string, values: (string | number)[]) => void;
  onAddCategory: (name: string) => void;
  onClose: () => void;
  onSetTitle: (title: string) => void;
  onSetSubtitle: (subtitle: string) => void;
}

export function EditPanel({
  project,
  editingBucket,
  editingCategory,
  onUpdateBucket,
  onRemoveBucket,
  onUpdateCategory,
  onRemoveCategory,
  onAddBucket,
  onAddCategory,
  onClose,
  onSetTitle,
  onSetSubtitle,
}: EditPanelProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBucketTitle, setNewBucketTitle] = useState('');
  const [newBucketValues, setNewBucketValues] = useState<string[]>(['XX', 'YY']);

  const editCategory = editingCategory
    ? project.categories.find(c => c.id === editingCategory)
    : editingBucket
      ? project.categories.find(c => c.id === editingBucket.categoryId)
      : null;

  const editBucket = editingBucket && editCategory
    ? editCategory.buckets.find(b => b.id === editingBucket.bucketId)
    : null;

  const [bucketTitle, setBucketTitle] = useState('');
  const [bucketValues, setBucketValues] = useState<string[]>([]);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (editBucket) {
      setBucketTitle(editBucket.title);
      setBucketValues(editBucket.values.map(String));
    }
  }, [editBucket]);

  useEffect(() => {
    if (editCategory && editingCategory) {
      setCategoryName(editCategory.name);
    }
  }, [editCategory, editingCategory]);

  useEffect(() => {
    const defaults = ['XX', 'YY', 'ZZ'];
    const valCount = project.legend.format === '3-value' ? 3 : 2;
    setNewBucketValues(defaults.slice(0, valCount));
  }, [project.legend.format]);

  const saveBucket = () => {
    if (editingBucket && editCategory) {
      onUpdateBucket(editingBucket.categoryId, editingBucket.bucketId, {
        title: bucketTitle,
        values: bucketValues.map(v => { const n = Number(v); return isNaN(n) ? v : n; }),
      });
    }
  };

  const saveCategory = () => {
    if (editingCategory) {
      onUpdateCategory(editingCategory, categoryName);
    }
  };

  return (
    <div className="side-panel w-80 p-5 overflow-y-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Edit</h2>
        <button
          onClick={onClose}
          className="text-xl cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          &times;
        </button>
      </div>

      {/* Title / Subtitle */}
      <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <label className="block text-xs font-semibold uppercase mb-1.5 tracking-wider" style={{ color: 'var(--text-secondary)' }}>Project Title</label>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          value={project.title}
          onChange={e => onSetTitle(e.target.value)}
        />
        <label className="block text-xs font-semibold uppercase mb-1.5 mt-3 tracking-wider" style={{ color: 'var(--text-secondary)' }}>Subtitle</label>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          value={project.subtitle || ''}
          onChange={e => onSetSubtitle(e.target.value)}
        />
      </div>

      {/* Editing a specific bucket */}
      {editBucket && editingBucket && (
        <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Edit Bucket</h3>
          <label className="block text-xs font-semibold uppercase mb-1.5 tracking-wider" style={{ color: 'var(--text-secondary)' }}>Title</label>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm mb-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            value={bucketTitle}
            onChange={e => setBucketTitle(e.target.value)}
          />
          {project.legend.labels.map((label, i) => (
            <div key={i}>
              <label className="block text-xs font-semibold uppercase mb-1.5 tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 text-sm mb-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                value={bucketValues[i] || ''}
                onChange={e => {
                  const updated = [...bucketValues];
                  updated[i] = e.target.value;
                  setBucketValues(updated);
                }}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={saveBucket} className="btn-accent px-4 py-1.5 rounded-full text-sm">Save</button>
            <button
              onClick={() => onRemoveBucket(editingBucket.categoryId, editingBucket.bucketId)}
              className="px-4 py-1.5 rounded-full text-sm cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Editing a category */}
      {editingCategory && editCategory && (
        <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Edit Category</h3>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm mb-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={saveCategory} className="btn-accent px-4 py-1.5 rounded-full text-sm">Save</button>
            <button
              onClick={() => onRemoveCategory(editingCategory)}
              className="px-4 py-1.5 rounded-full text-sm cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Add new bucket to selected category */}
      {(editingCategory || editingBucket) && editCategory && (
        <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Add Bucket to "<span style={{ color: 'var(--accent-cyan)' }}>{editCategory.name}</span>"
          </h3>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm mb-3"
            placeholder="Bucket title"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            value={newBucketTitle}
            onChange={e => setNewBucketTitle(e.target.value)}
          />
          {project.legend.labels.map((label, i) => (
            <div key={i}>
              <label className="block text-xs mb-1.5 tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 text-sm mb-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                value={newBucketValues[i] || ''}
                onChange={e => {
                  const updated = [...newBucketValues];
                  updated[i] = e.target.value;
                  setNewBucketValues(updated);
                }}
              />
            </div>
          ))}
          <button
            onClick={() => {
              if (newBucketTitle.trim()) {
                onAddBucket(editCategory.id, newBucketTitle.trim(), newBucketValues.map(v => { const n = Number(v); return isNaN(n) ? v : n; }));
                setNewBucketTitle('');
                setNewBucketValues(['XX', 'YY', 'ZZ'].slice(0, project.legend.labels.length));
              }
            }}
            className="btn-accent px-4 py-1.5 rounded-full text-sm"
          >
            Add Bucket
          </button>
        </div>
      )}

      {/* Add new category */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Add Category</h3>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="Category name"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
        />
        <button
          onClick={() => {
            if (newCategoryName.trim()) {
              onAddCategory(newCategoryName.trim());
              setNewCategoryName('');
            }
          }}
          className="btn-accent px-4 py-1.5 rounded-full text-sm"
        >
          Add Category
        </button>
      </div>
    </div>
  );
}
