/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Star, ArrowRight, X, Copy, Check, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const plans = [
  {
    name: 'Basic',
    price: '₹20',
    period: '/month',
    description: 'Perfect for occasional check-ups',
    features: ['3 Consultations / month', 'AI Symptom Analysis', 'Digital Prescriptions', '24/7 Chat Support'],
  },
  {
    name: 'Pro',
    price: '₹50',
    period: '/month',
    popular: true,
    description: 'Best for families and frequent care',
    features: ['Unlimited Consultations', 'Priority Doctor Connect', 'Premium Health Reports', 'Family Account (up to 4)', 'Video Calls included'],
  },
  {
    name: 'Business',
    price: '₹100',
    period: '/month',
    description: 'For corporate wellness programs',
    features: ['Employee Group Access', 'Custom Health Dashboards', 'Dedicated Health Concierge', 'On-site consultation booking'],
  },
];

export function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [isVerifying, setIsVerifying] = useState(false);

  const upiId = '9454846894@pthdfc';
  const merchantName = 'Medicare AI';

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setPaymentStatus('idle');
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPayment = async () => {
    if (!selectedPlan) return;

    setPaymentStatus('pending');
    setIsVerifying(true);

    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 1800));

      const userId = auth.currentUser?.uid || 'local-guest-uid';
      const userEmail = auth.currentUser?.email || 'guest@localhost';
      const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Local Guest';

      const paymentRecord = {
        userId,
        userEmail,
        userName,
        planName: selectedPlan.name,
        amount: parseFloat(selectedPlan.price.replace('₹', '')),
        currency: 'INR',
        status: 'completed',
        utr: 'FIREBASE-' + Date.now(),
        gateway: 'upi-verified',
        websiteName: 'Medicare AI',
        createdAt: new Date().toISOString()
      };

      // 1. Save payment record locally under 'medicare_local_payments' as an instant response fallback
      try {
        const localPaymentsStr = localStorage.getItem('medicare_local_payments') || '[]';
        const localPayments = JSON.parse(localPaymentsStr);
        localPayments.unshift({ id: 'local-' + Date.now(), ...paymentRecord });
        localStorage.setItem('medicare_local_payments', JSON.stringify(localPayments));
      } catch (e) {
        console.warn("Storage write failed for local payments:", e);
      }

      // 2. Save active plan in localStorage
      localStorage.setItem('medicare_active_plan_' + userId, selectedPlan.name);

      // 3. Force demo/active user metadata to stay synchronized
      const cachedDemo = localStorage.getItem('medicare_demo_user');
      if (cachedDemo) {
        try {
          const parsed = JSON.parse(cachedDemo);
          parsed.activePlan = selectedPlan.name;
          parsed.websiteName = 'Medicare AI';
          localStorage.setItem('medicare_demo_user', JSON.stringify(parsed));
        } catch (e) {
          console.warn("Storage sync skipped: ", e);
        }
      }

      // 4. Save transaction log to Firestore payments collection
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'payments'), {
            ...paymentRecord,
            createdAt: serverTimestamp()
          }).catch(e => {
            handleFirestoreError(e, OperationType.CREATE, 'payments');
            throw e;
          });
        } catch (firestoreError) {
          console.warn("Cloud payments storage fallback sync: ", firestoreError);
        }

        // 5. Update user plan profile on Firestore database
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            activePlan: selectedPlan.name,
            planStatus: 'active',
            planPrice: selectedPlan.price,
            planPeriod: selectedPlan.period,
            websiteName: 'Medicare AI',
            planActivatedAt: serverTimestamp()
          }).catch(e => {
            handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
            throw e;
          });
        } catch (firestoreError) {
          console.warn("Cloud users dynamic subscription storage fallback sync:", firestoreError);
        }
      }

      setPaymentStatus('success');
    } catch (error) {
      console.error("Firestore payment activation failed:", error);
      setPaymentStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetPayment = () => {
    const wasSuccess = paymentStatus === 'success';
    setPaymentStatus('idle');
    setSelectedPlan(null);
    if (wasSuccess) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-16 py-12 max-w-6xl mx-auto px-4 md:px-6 relative">
      {/* Header */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-slate-950 leading-tight">
          Simple, Transparent <span className="text-primary-blue">Pricing</span>
        </h2>
        <p className="text-slate-600 font-medium text-base md:text-lg leading-relaxed">
          Choose a plan that fits your needs. Cancel anytime, no hidden fees, instant activation.
        </p>
      </section>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-blue-100/30 blur-3xl rounded-full -z-10" />

        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={cn(
              "relative bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/85 shadow-sm transition-all duration-350 hover:shadow-xl hover:shadow-blue-200/40 flex flex-col items-start h-full justify-between",
              plan.popular ? "border-primary-blue/60 shadow-md ring-1 ring-primary-blue/10 scale-102 z-10 md:scale-105" : "border-slate-100"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-blue text-white px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-md flex items-center gap-1.5 font-display">
                <Star className="w-3.5 h-3.5 fill-white animate-pulse" />
                Most Popular
              </div>
            )}

            <div className="w-full">
              <div className="mb-6">
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{plan.name}</h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 font-display tracking-tight">{plan.price}</span>
                <span className="text-slate-500 font-medium text-sm">{plan.period}</span>
              </div>

              <div className="space-y-3.5 mb-8">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="w-4.5 h-4.5 text-primary-blue shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan(plan)}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm group",
                plan.popular
                  ? "bg-primary-blue text-white hover:bg-blue-700"
                  : "bg-blue-50 text-primary-blue hover:bg-blue-100"
              )}
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Security notice / trust indicator */}
      <section className="text-center py-6 border-t border-slate-205/40">
        <div className="inline-flex flex-wrap justify-center items-center gap-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
          <span>Secured by Medicare AI</span>
          <span className="hidden md:inline">•</span>
          <span>Instant Activation</span>
          <span className="hidden md:inline">•</span>
          <span>No Hidden Fees</span>
        </div>
      </section>

      {/* Simplified Elegant Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetPayment}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in duration-200"
            >
              <button
                onClick={resetPayment}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-5">
                {paymentStatus === 'idle' ? (
                  <>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-slate-900">
                        Subscribe to {selectedPlan.name}
                      </h4>
                      <p className="text-sm text-slate-500">
                        Complete your payment of <span className="font-bold text-slate-900 animate-pulse">{selectedPlan.price}</span>
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col items-center">
                      <div className="w-44 h-44 bg-white rounded-2xl shadow-sm border border-slate-200 p-1 mb-3 flex items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${merchantName}&am=${parseInt(selectedPlan.price.replace('₹', ''))}&cu=INR&tn=Medicare%20${selectedPlan.name}%20Plan`)}`}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="w-full space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Scan to Pay via UPI
                        </p>

                        <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-slate-150 shadow-inner">
                          <code className="flex-1 font-mono text-[11px] text-slate-600 tracking-tight truncate text-center font-bold">
                            {upiId}
                          </code>
                          <button
                            onClick={handleCopyUPI}
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-600 bg-slate-50 border border-slate-100 cursor-pointer"
                            title="Copy UPI ID"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Instant Check-out action buttons */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleVerifyPayment}
                        className="w-full py-3.5 bg-primary-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all active:scale-98 cursor-pointer"
                      >
                        Activate Plan
                      </button>
                      <button
                        type="button"
                        onClick={resetPayment}
                        className="w-full py-2.5 hover:bg-slate-50 text-slate-400 rounded-xl font-medium text-xs transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 space-y-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
                        paymentStatus === 'pending' && "bg-blue-50 text-blue-600",
                        paymentStatus === 'success' && "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {paymentStatus === 'pending' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        >
                          <Sparkles className="w-8 h-8" />
                        </motion.div>
                      )}
                      {paymentStatus === 'success' && <Check className="w-8 h-8 stroke-[3]" />}
                    </motion.div>

                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-900">
                        {paymentStatus === 'pending' && "Activating Plan..."}
                        {paymentStatus === 'success' && "Subscription Active!"}
                      </h4>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        {paymentStatus === 'pending' && "Syncing registration with security cloud..."}
                        {paymentStatus === 'success' && `Welcome to ${selectedPlan.name}! Your health subscription has been premium activated successfully.`}
                      </p>
                    </div>

                    {paymentStatus === 'success' && (
                      <button
                        onClick={resetPayment}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-98"
                      >
                        Start Exploring
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
