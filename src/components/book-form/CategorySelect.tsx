/**
 * Searchable Category / Genre selector with a custom "Others" entry.
 * Markup and class names match the existing form styling.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, OTHER_CATEGORY } from "./options";

interface CategorySelectProps {
  categoryId: string;
  customCategory: string;
  onChange: (categoryId: string, customCategory: string) => void;
  disabled?: boolean;
}

export function CategorySelect({
  categoryId,
  customCategory,
  onChange,
  disabled,
}: CategorySelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = CATEGORIES.filter(
    (category) =>
      category.name.toLowerCase().includes(normalizedSearch) ||
      category.description.toLowerCase().includes(normalizedSearch)
  );

  const selectedCategory = CATEGORIES.find((category) => category.id === categoryId);
  const displayValue = selectedCategory
    ? selectedCategory.name
    : categoryId === OTHER_CATEGORY.id
      ? customCategory
      : search;

  const selectCategory = (nextId: string) => {
    if (nextId === OTHER_CATEGORY.id) {
      onChange(OTHER_CATEGORY.id, customCategory);
      setIsOpen(false);
      return;
    }
    onChange(nextId, "");
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="category-selector relative" ref={containerRef}>
      <div className="category-input-wrapper">
        <input
          type="text"
          id="bookCategory"
          placeholder="Search or select a category..."
          value={displayValue}
          onClick={() => setIsOpen(true)}
          onChange={(event) => {
            onChange("", "");
            setSearch(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (categoryId) {
              onChange("", "");
              setSearch("");
            }
            setIsOpen(true);
          }}
          disabled={disabled}
          className="flex-1 cursor-pointer"
        />
        <span
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
          className="shrink-0 cursor-pointer select-none px-3 font-mono text-xs text-[var(--text-muted)]"
        >
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {categoryId === OTHER_CATEGORY.id && (
        <input
          type="text"
          id="customCategory"
          placeholder="Enter your custom category"
          value={customCategory}
          onChange={(event) => onChange(OTHER_CATEGORY.id, event.target.value)}
          disabled={disabled}
          className="custom-category-input mt-2.5"
        />
      )}

      {isOpen && (
        <div className="category-dropdown">
          <div className="category-list">
            {filtered.length > 0 ? (
              filtered.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-option ${categoryId === category.id ? "selected" : ""}`}
                  onClick={() => selectCategory(category.id)}
                  disabled={disabled}
                >
                  <span className="category-option-name">{category.name}</span>
                  <span className="category-option-description">{category.description}</span>
                </button>
              ))
            ) : (
              <div className="category-empty">No categories found</div>
            )}
            <button
              type="button"
              className={`category-option other-option ${categoryId === OTHER_CATEGORY.id ? "selected" : ""}`}
              onClick={() => selectCategory(OTHER_CATEGORY.id)}
              disabled={disabled}
            >
              <span className="category-option-name">{OTHER_CATEGORY.name}</span>
              <span className="category-option-description">{OTHER_CATEGORY.description}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
