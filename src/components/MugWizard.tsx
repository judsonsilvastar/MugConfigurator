'use client';

import React, { useMemo, useState } from 'react';
import MugConfigurator from './MugConfigurator';
import styles from './MugWizard.module.css';

type WizardStep = 0 | 1 | 2;

interface MugOption {
  id: string;
  name: string;
  imageUrl: string;
  modelUrl: string;
}

interface DeliveryForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

const STEPS = ['Choose the Mug', 'Preview', 'Purchase'];

const MUG_OPTIONS: MugOption[] = [
  {
    id: 'heart-shaped',
    name: 'Heart Shaped',
    imageUrl: '/images/mug-heart-shaped.png',
    modelUrl: '/models/mug_heart_shaped_texture.glb',
  },
  {
    id: 'couple',
    name: 'Couple',
    imageUrl: '/images/mug-couple.png',
    modelUrl: '/models/mug_couple_texture.glb',
  },
  {
    id: 'heart',
    name: 'Heart Classic',
    imageUrl: '/images/mug-heart-shaped.png',
    modelUrl: '/models/mug_heart_texture.glb',
  },
  {
    id: 'original',
    name: 'Original',
    imageUrl: '/images/mug-couple.png',
    modelUrl: '/models/mug_origin_texture.glb',
  },
];

const MugWizard: React.FC = () => {
  const [step, setStep] = useState<WizardStep>(0);
  const [selectedMugId, setSelectedMugId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryForm>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  });

  const selectedMug = useMemo(
    () => MUG_OPTIONS.find((option) => option.id === selectedMugId) ?? null,
    [selectedMugId]
  );

  const canGoNext = useMemo(() => {
    if (step === 0) return selectedMugId !== null;
    if (step === 1) return true;
    return false;
  }, [selectedMugId, step]);

  const goPrev = () => setStep((prev) => Math.max(0, prev - 1) as WizardStep);
  const goNext = () => {
    if (!canGoNext) return;
    setStep((prev) => Math.min(2, prev + 1) as WizardStep);
  };

  const handleDeliveryChange = (key: keyof DeliveryForm, value: string) => {
    setDelivery((prev) => ({ ...prev, [key]: value }));
  };

  const submitPurchase = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.alert('Purchase details saved. You can now connect checkout/payment.');
  };

  return (
    <div className={styles.page}>
      <div className={styles.progressRow}>
        <button className={styles.navButton} type="button" onClick={goPrev} disabled={step === 0}>
          Prev
        </button>

        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
          <div className={styles.stepLabels}>
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`${styles.stepLabel} ${index <= step ? styles.stepActive : ''}`}
                onClick={() => setStep(index as WizardStep)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button className={styles.navButton} type="button" onClick={goNext} disabled={!canGoNext || step === 2}>
          Next
        </button>
      </div>

      {step === 0 && (
        <section className={styles.stepContent}>
          <h2>Choose Your Mug</h2>
          <p className={styles.helperText}>Select one mug to continue to the 3D preview.</p>
          <div className={styles.grid}>
            {MUG_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.card} ${selectedMugId === option.id ? styles.cardSelected : ''}`}
                onClick={() => setSelectedMugId(option.id)}
              >
                <img src={option.imageUrl} alt={option.name} className={styles.cardImage} />
                <span className={styles.cardTitle}>{option.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className={styles.previewStep}>
          <MugConfigurator selectedModelUrl={selectedMug?.modelUrl ?? null} />
        </section>
      )}

      {step === 2 && (
        <section className={styles.stepContent}>
          <h2>Purchase Details</h2>
          <form className={styles.form} onSubmit={submitPurchase}>
            <input
              className={styles.input}
              placeholder="Full Name"
              value={delivery.fullName}
              onChange={(e) => handleDeliveryChange('fullName', e.target.value)}
              required
            />
            <input
              className={styles.input}
              placeholder="Email"
              type="email"
              value={delivery.email}
              onChange={(e) => handleDeliveryChange('email', e.target.value)}
              required
            />
            <input
              className={styles.input}
              placeholder="Phone"
              value={delivery.phone}
              onChange={(e) => handleDeliveryChange('phone', e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Street Address"
              value={delivery.address}
              onChange={(e) => handleDeliveryChange('address', e.target.value)}
              required
            />
            <div className={styles.inlineFields}>
              <input
                className={styles.input}
                placeholder="City"
                value={delivery.city}
                onChange={(e) => handleDeliveryChange('city', e.target.value)}
                required
              />
              <input
                className={styles.input}
                placeholder="State"
                value={delivery.state}
                onChange={(e) => handleDeliveryChange('state', e.target.value)}
                required
              />
              <input
                className={styles.input}
                placeholder="Postal Code"
                value={delivery.postalCode}
                onChange={(e) => handleDeliveryChange('postalCode', e.target.value)}
                required
              />
            </div>
            <textarea
              className={styles.textarea}
              placeholder="Delivery Notes (optional)"
              value={delivery.notes}
              onChange={(e) => handleDeliveryChange('notes', e.target.value)}
            />
            <button className={styles.placeOrderButton} type="submit">
              Place Order
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

export default MugWizard;
