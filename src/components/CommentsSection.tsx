"use client";
import { useState, useEffect, useCallback } from "react";

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommentsSectionProps {
  recipeSlug: string;
}

export function CommentsSection({ recipeSlug }: CommentsSectionProps) {
  const [commentList, setCommentList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/recipes/${recipeSlug}/comments`);
    const data = await res.json();
    setCommentList(data.comments ?? []);
    setLoading(false);
  }, [recipeSlug]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/recipes/${recipeSlug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: authorName.trim(),
        content: content.trim(),
      }),
    });

    if (res.ok) {
      setContent("");
      await loadComments();
    } else {
      setError("שגיאה בשליחת התגובה. נסה שוב.");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/recipes/${recipeSlug}/comments/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    await loadComments();
  }

  return (
    <section className="mt-10 border-t border-stone-200 pt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">💬 תגובות</h2>

      {/* Comments list */}
      {loading ? (
        <p className="text-gray-400 mb-6">טוען תגובות...</p>
      ) : commentList.length === 0 ? (
        <p className="text-gray-400 mb-6">אין תגובות עדיין — היה הראשון!</p>
      ) : (
        <div className="space-y-4 mb-8">
          {commentList.map((c) => (
            <div key={c.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{c.author_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Delete controls */}
                {confirmDeleteId === c.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-500">מחק תגובה?</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingId === c.id ? "..." : "כן"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-0.5 bg-stone-200 text-gray-600 rounded-md hover:bg-stone-300"
                    >
                      לא
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    title="מחק תגובה"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">הוסף תגובה</h3>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="שמך"
          maxLength={80}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="כתוב תגובה..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!authorName.trim() || !content.trim() || submitting}
          className="self-start px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "שולח..." : "פרסם תגובה"}
        </button>
      </form>
    </section>
  );
}
