"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { UrlReviewItem } from "@/components/UrlReviewItem";
import type { ParsedUrl } from "@/lib/whatsapp-parser";

type WizardStep = "upload" | "list" | "review" | "done";

export default function AdminImportPage() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError("");
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Parse failed");
      const data = await res.json();
      setParsedUrls(data.urls);
      setStep("list");
    } catch {
      setError("שגיאה בניתוח הקובץ. ודא שהקובץ הוא ייצוא תקין של WhatsApp.");
    } finally {
      setParsing(false);
    }
  }

  function handleSaved() {
    setSavedCount((c) => c + 1);
    advance();
  }

  function handleSkipped() {
    setSkippedCount((c) => c + 1);
    advance();
  }

  function advance() {
    if (currentIndex + 1 >= parsedUrls.length) {
      setStep("done");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  const progress =
    parsedUrls.length > 0
      ? Math.round(((savedCount + skippedCount) / parsedUrls.length) * 100)
      : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ייבוא WhatsApp</h1>
      <p className="text-gray-500 text-sm mb-6">
        ייצא שיחה מ-WhatsApp (ללא מדיה), העלה את קובץ ה-TXT וה-AI יחלץ את המתכונים והמסעדות.
      </p>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-600 mb-6">
            בחר קובץ ייצוא שיחת WhatsApp (פורמט .txt)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            id="whatsapp-file"
          />
          <label
            htmlFor="whatsapp-file"
            className="inline-block cursor-pointer px-5 py-2.5 rounded-xl border-2 border-dashed border-stone-300 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm font-medium mb-4"
          >
            בחר קובץ .txt
          </label>
          <div className="mt-4">
            <Button onClick={handleParse} loading={parsing}>
              נתח קובץ
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {/* Step 2: URL list summary */}
      {step === "list" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{parsedUrls.length}</p>
          <p className="text-gray-500 mb-6">קישורים נמצאו בשיחה</p>
          <Button onClick={() => setStep("review")} size="lg">
            התחל סקירה
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            תסקור כל קישור אחד אחד, תערוך במידת הצורך ותשמור
          </p>
        </div>
      )}

      {/* Step 3: Review queue */}
      {step === "review" && (
        <div>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>
                {currentIndex + 1} / {parsedUrls.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <UrlReviewItem
            key={parsedUrls[currentIndex].url}
            parsedUrl={parsedUrls[currentIndex]}
            onSave={handleSaved}
            onSkip={handleSkipped}
          />
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">הייבוא הושלם!</h2>
          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{savedCount}</p>
              <p className="text-sm text-gray-500">נשמרו</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{skippedCount}</p>
              <p className="text-sm text-gray-500">דולגו</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <a
              href="/recipes"
              className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              לצפייה במתכונים
            </a>
            <a
              href="/restaurants"
              className="px-4 py-2 bg-white border border-stone-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              לצפייה במסעדות
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
