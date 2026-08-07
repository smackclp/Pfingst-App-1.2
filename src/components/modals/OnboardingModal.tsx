import React from "react";
import { Compass, Calendar, ShoppingBag, Sun, ArrowRight, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface OnboardingModalProps {
  onClose: () => void;
}

interface Step {
  icon: React.ElementType;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    icon: Compass,
    title: "Willkommen bei der Pfingstlager-App! 🏕️",
    text: "Hier findest du alles rund um deinen Einsatz beim Zeltlager: deine Schichten, wichtige Infos und die Bestellliste - alles an einem Ort.",
  },
  {
    icon: Calendar,
    title: "Mein Plan",
    text: "Unter „Mein Plan“ siehst du deine eigenen Schichten. Mit einem Klick kannst du zusagen, absagen oder „vielleicht“ auswählen.",
  },
  {
    icon: ShoppingBag,
    title: "Bestellliste & Programm",
    text: "Material brauchst? Einfach Foto machen und kurz beschreiben - fertig. Unter „Programm“ findest du Talentshow und Spiel ohne Grenzen.",
  },
  {
    icon: Sun,
    title: "Sonnenlicht-Modus",
    text: "Bei praller Sonne auf dem Zeltplatz: Tippe oben auf das Sonnen-Symbol für größere Schrift und mehr Kontrast.",
  },
];

/**
 * Kurze 4-Schritte-Einführung für neue Nutzer, einmalig nach dem ersten
 * Login gezeigt (LocalStorage-Flag). Jederzeit überspringbar.
 */
export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const Icon = step.icon;
  const titleId = React.useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(true);
  useEscapeKey(true, onClose);

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      id="onboarding-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-emerald-500/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 cursor-pointer"
          id="onboarding-skip-btn"
          title="Überspringen"
          aria-label="Überspringen"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            className="space-y-4 text-center pt-2"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Icon className="h-7 w-7 text-emerald-400" aria-hidden="true" />
            </div>
            <h3 id={titleId} className="text-base font-bold text-white font-display">{step.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{step.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Step-Indikator */}
        <div className="flex items-center justify-center gap-1.5" id="onboarding-step-dots">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-emerald-500" : "w-1.5 bg-slate-700"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          {stepIndex > 0 ? (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-slate-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück</span>
            </button>
          ) : (
            <button onClick={onClose} className="px-3.5 py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold cursor-pointer">
              Überspringen
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer shadow-lg shadow-emerald-500/20"
              id="onboarding-finish-btn"
            >
              Los geht's! 🎉
            </button>
          ) : (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer shadow-lg shadow-emerald-500/20"
              id="onboarding-next-btn"
            >
              <span>Weiter</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
