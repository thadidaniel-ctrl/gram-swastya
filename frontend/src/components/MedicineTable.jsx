import React from 'react';
import styles from './MedicineTable.css';

const medicines = [
  {
    id: 1,
    name: 'Paracetamol (Acetaminophen)',
    class: 'Analgesic / Antipyretic',
    commonUse: 'Pain, fever',
    sideEffects: 'Liver strain in overdose, rare rash',
    alternatives: 'Ibuprofen, Aspirin'
  },
  {
    id: 2,
    name: 'Ibuprofen',
    class: 'NSAID',
    commonUse: 'Pain, inflammation, fever',
    sideEffects: 'Stomach upset, ulcer risk, kidney strain',
    alternatives: 'Naproxen, Paracetamol'
  },
  {
    id: 3,
    name: 'Aspirin',
    class: 'Salicylate / Antiplatelet',
    commonUse: 'Pain, fever, blood thinning',
    sideEffects: 'GI bleeding, tinnitus',
    alternatives: 'Clopidogrel, Paracetamol'
  },
  {
    id: 4,
    name: 'Amoxicillin',
    class: 'Penicillin Antibiotic',
    commonUse: 'Bacterial infections',
    sideEffects: 'Diarrhea, rash, nausea',
    alternatives: 'Azithromycin, Cephalexin'
  },
  {
    id: 5,
    name: 'Azithromycin',
    class: 'Macrolide Antibiotic',
    commonUse: 'Bacterial infections (respiratory)',
    sideEffects: 'GI upset, QT prolongation',
    alternatives: 'Amoxicillin, Doxycycline'
  },
  {
    id: 6,
    name: 'Metformin',
    class: 'Biguanide Antidiabetic',
    commonUse: 'Type 2 diabetes',
    sideEffects: 'GI upset, B12 deficiency',
    alternatives: 'Sulfonylureas, SGLT2 inhibitors'
  },
  {
    id: 7,
    name: 'Atorvastatin',
    class: 'HMG-CoA Reductase Inhibitor',
    commonUse: 'High cholesterol',
    sideEffects: 'Muscle pain, liver enzyme rise',
    alternatives: 'Rosuvastatin, Simvastatin'
  },
  {
    id: 8,
    name: 'Amlodipine',
    class: 'Calcium Channel Blocker',
    commonUse: 'Hypertension',
    sideEffects: 'Ankle swelling, flushing',
    alternatives: 'Losartan, Metoprolol'
  },
  {
    id: 9,
    name: 'Losartan',
    class: 'Angiotensin II Receptor Blocker',
    commonUse: 'Hypertension',
    sideEffects: 'Dizziness, high potassium',
    alternatives: 'Amlodipine, Enalapril'
  },
  {
    id: 10,
    name: 'Omeprazole',
    class: 'Proton Pump Inhibitor',
    commonUse: 'Acid reflux, ulcers',
    sideEffects: 'Headache, long-term B12/Mg deficiency',
    alternatives: 'Pantoprazole, Ranitidine'
  },
  {
    id: 11,
    name: 'Metoprolol',
    class: 'Beta-Blocker',
    commonUse: 'Hypertension, heart conditions',
    sideEffects: 'Fatigue, low heart rate',
    alternatives: 'Atenolol, Amlodipine'
  },
  {
    id: 12,
    name: 'Levothyroxine',
    class: 'Thyroid Hormone Replacement',
    commonUse: 'Hypothyroidism',
    sideEffects: 'Palpitations if overdosed, insomnia',
    alternatives: 'Liothyronine'
  },
  {
    id: 13,
    name: 'Cetirizine',
    class: 'Antihistamine',
    commonUse: 'Allergies',
    sideEffects: 'Drowsiness, dry mouth',
    alternatives: 'Loratadine, Fexofenadine'
  },
  {
    id: 14,
    name: 'Loratadine',
    class: 'Antihistamine (2nd Gen)',
    commonUse: 'Allergies',
    sideEffects: 'Headache, dry mouth (less sedating)',
    alternatives: 'Cetirizine, Fexofenadine'
  },
  {
    id: 15,
    name: 'Salbutamol (Albuterol)',
    class: 'Short-Acting Beta2-Agonist',
    commonUse: 'Asthma, COPD',
    sideEffects: 'Tremor, rapid heartbeat',
    alternatives: 'Levosalbutamol, Terbutaline'
  },
  {
    id: 16,
    name: 'Prednisone',
    class: 'Corticosteroid',
    commonUse: 'Inflammation, autoimmune disease',
    sideEffects: 'Weight gain, mood changes, high sugar',
    alternatives: 'Hydrocortisone, Methylprednisolone'
  },
  {
    id: 17,
    name: 'Insulin (various)',
    class: 'Hypoglycemic Agent',
    commonUse: 'Diabetes',
    sideEffects: 'Hypoglycemia, weight gain',
    alternatives: 'Metformin (Type 2), GLP-1 agonists'
  },
  {
    id: 18,
    name: 'Diazepam',
    class: 'Benzodiazepine',
    commonUse: 'Anxiety, muscle spasm',
    sideEffects: 'Drowsiness, dependence risk',
    alternatives: 'Lorazepam, Alprazolam'
  },
  {
    id: 19,
    name: 'Alprazolam',
    class: 'Triazolo-Benzodiazepine',
    commonUse: 'Anxiety, panic disorder',
    sideEffects: 'Sedation, dependence',
    alternatives: 'Diazepam, Buspirone'
  },
  {
    id: 20,
    name: 'Sertraline',
    class: 'SSRI Antidepressant',
    commonUse: 'Depression, anxiety',
    sideEffects: 'Nausea, insomnia, sexual side effects',
    alternatives: 'Fluoxetine, Escitalopram'
  },
  {
    id: 21,
    name: 'Fluoxetine',
    class: 'SSRI Antidepressant',
    commonUse: 'Depression, OCD',
    sideEffects: 'Insomnia, appetite changes',
    alternatives: 'Sertraline, Citalopram'
  },
  {
    id: 22,
    name: 'Escitalopram',
    class: 'SSRI Antidepressant',
    commonUse: 'Depression, anxiety',
    sideEffects: 'Nausea, fatigue',
    alternatives: 'Sertraline, Fluoxetine'
  },
  {
    id: 23,
    name: 'Metronidazole',
    class: 'Nitroimidazole Antibiotic',
    commonUse: 'Bacterial/parasitic infections',
    sideEffects: 'Metallic taste, nausea (avoid alcohol)',
    alternatives: 'Tinidazole, Clindamycin'
  },
  {
    id: 24,
    name: 'Ciprofloxacin',
    class: 'Fluoroquinolone Antibiotic',
    commonUse: 'Bacterial infections',
    sideEffects: 'Tendon rupture risk, GI upset',
    alternatives: 'Levofloxacin, Amoxicillin'
  },
  {
    id: 25,
    name: 'Doxycycline',
    class: 'Tetracycline Antibiotic',
    commonUse: 'Bacterial infections, acne',
    sideEffects: 'Sun sensitivity, GI upset',
    alternatives: 'Azithromycin, Minocycline'
  },
  {
    id: 26,
    name: 'Furosemide',
    class: 'Loop Diuretic',
    commonUse: 'Fluid retention, heart failure',
    sideEffects: 'Dehydration, low potassium',
    alternatives: 'Spironolactone, Hydrochlorothiazide'
  },
  {
    id: 27,
    name: 'Hydrochlorothiazide',
    class: 'Thiazide Diuretic',
    commonUse: 'Hypertension',
    sideEffects: 'Low potassium, frequent urination',
    alternatives: 'Chlorthalidone, Furosemide'
  },
  {
    id: 28,
    name: 'Warfarin',
    class: 'Vitamin K Antagonist',
    commonUse: 'Blood clot prevention',
    sideEffects: 'Bleeding risk',
    alternatives: 'Rivaroxaban, Apixaban'
  },
  {
    id: 29,
    name: 'Clopidogrel',
    class: 'Thienopyridine Antiplatelet',
    commonUse: 'Blood clot prevention',
    sideEffects: 'Bruising, bleeding',
    alternatives: 'Aspirin, Ticagrelor'
  },
  {
    id: 30,
    name: 'Tramadol',
    class: 'Opioid Analgesic',
    commonUse: 'Moderate-severe pain',
    sideEffects: 'Nausea, dizziness, dependence risk',
    alternatives: 'Codeine, Paracetamol combos'
  },
  {
    id: 31,
    name: 'Codeine',
    class: 'Opioid Analgesic / Cough Suppressant',
    commonUse: 'Pain, cough suppression',
    sideEffects: 'Constipation, drowsiness',
    alternatives: 'Tramadol, Dextromethorphan'
  },
  {
    id: 32,
    name: 'Ranitidine*',
    class: 'H2 Antagonist',
    commonUse: 'Acid reflux',
    sideEffects: 'Headache (*withdrawn in many countries)',
    alternatives: 'Omeprazole, Famotidine'
  },
  {
    id: 33,
    name: 'Famotidine',
    class: 'H2 Antagonist',
    commonUse: 'Acid reflux, ulcers',
    sideEffects: 'Headache, dizziness',
    alternatives: 'Omeprazole, Ranitidine'
  },
  {
    id: 34,
    name: 'Domperidone',
    class: 'Dopamine Antagonist',
    commonUse: 'Nausea, vomiting',
    sideEffects: 'Dry mouth, cardiac risk (high dose)',
    alternatives: 'Ondansetron, Metoclopramide'
  },
  {
    id: 35,
    name: 'Ondansetron',
    class: '5-HT3 Antagonist',
    commonUse: 'Nausea, vomiting',
    sideEffects: 'Headache, constipation',
    alternatives: 'Domperidone, Metoclopramide'
  },
  {
    id: 36,
    name: 'Diclofenac',
    class: 'NSAID',
    commonUse: 'Pain, inflammation',
    sideEffects: 'GI upset, cardiovascular risk',
    alternatives: 'Ibuprofen, Naproxen'
  },
  {
    id: 37,
    name: 'Naproxen',
    class: 'Propionic Acid NSAID',
    commonUse: 'Pain, inflammation',
    sideEffects: 'GI upset, fluid retention',
    alternatives: 'Ibuprofen, Diclofenac'
  },
  {
    id: 38,
    name: 'Montelukast',
    class: 'Leukotriene Receptor Antagonist',
    commonUse: 'Asthma, allergies',
    sideEffects: 'Headache, mood changes (rare)',
    alternatives: 'Salbutamol, Antihistamines'
  },
  {
    id: 39,
    name: 'Insulin Glargine',
    class: 'Long-Acting Insulin',
    commonUse: 'Diabetes (long-acting)',
    sideEffects: 'Hypoglycemia, weight gain',
    alternatives: 'Insulin Detemir, Metformin'
  },
  {
    id: 40,
    name: 'Clonazepam',
    class: 'Benzodiazepine',
    commonUse: 'Seizures, anxiety',
    sideEffects: 'Sedation, dependence',
    alternatives: 'Diazepam, Lorazepam'
  },
  {
    id: 41,
    name: 'Gabapentin',
    class: 'Anticonvulsant / Neuropathic',
    commonUse: 'Nerve pain, seizures',
    sideEffects: 'Dizziness, drowsiness',
    alternatives: 'Pregabalin, Amitriptyline'
  },
  {
    id: 42,
    name: 'Pregabalin',
    class: 'Anticonvulsant / Neuropathic',
    commonUse: 'Nerve pain, anxiety',
    sideEffects: 'Weight gain, dizziness',
    alternatives: 'Gabapentin, Duloxetine'
  },
  {
    id: 43,
    name: 'Amitriptyline',
    class: 'Tricyclic Antidepressant',
    commonUse: 'Depression, nerve pain',
    sideEffects: 'Dry mouth, weight gain, sedation',
    alternatives: 'Nortriptyline, Duloxetine'
  },
  {
    id: 44,
    name: 'Duloxetine',
    class: 'SNRI Antidepressant',
    commonUse: 'Depression, nerve pain',
    sideEffects: 'Nausea, dry mouth',
    alternatives: 'Amitriptyline, Venlafaxine'
  },
  {
    id: 45,
    name: 'Losartan/HCTZ',
    class: 'Combination Antihypertensive',
    commonUse: 'Hypertension (combo)',
    sideEffects: 'Dizziness, electrolyte imbalance',
    alternatives: 'Amlodipine, Telmisartan'
  },
  {
    id: 46,
    name: 'Telmisartan',
    class: 'Angiotensin II Receptor Blocker',
    commonUse: 'Hypertension',
    sideEffects: 'Dizziness, back pain',
    alternatives: 'Losartan, Amlodipine'
  },
  {
    id: 47,
    name: 'Rosuvastatin',
    class: 'HMG-CoA Reductase Inhibitor',
    commonUse: 'High cholesterol',
    sideEffects: 'Muscle pain, liver enzyme rise',
    alternatives: 'Atorvastatin, Simvastatin'
  },
  {
    id: 48,
    name: 'Multivitamins',
    class: 'Nutritional Supplement',
    commonUse: 'Nutritional support',
    sideEffects: 'Mild GI upset, rare toxicity in excess',
    alternatives: 'Individual vitamin supplements'
  },
  {
    id: 49,
    name: 'Vitamin D3',
    class: 'Vitamin',
    commonUse: 'Deficiency, bone health',
    sideEffects: 'Nausea (high doses), hypercalcemia',
    alternatives: 'Calcitriol, Sunlight exposure'
  },
  {
    id: 50,
    name: 'Iron supplements (Ferrous sulfate)',
    class: 'Iron Replacement',
    commonUse: 'Anemia',
    sideEffects: 'Constipation, dark stools, nausea',
    alternatives: 'Iron polymaltose, dietary iron'
  }
];

const MedicineTable = function MedicineTable() {
  return (
    <div className="medicine-table-container">
      <h2 className="medicine-table-title">Medicine Reference Table</h2>
      <p className="medicine-table-subtitle">
        Common medications, their uses, side effects, and alternatives
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className="medicine-name">Medicine / Class</th>
            <th className="common-use">Common Use</th>
            <th className="side-effects">Common Side Effects</th>
            <th className="alternatives">Alternatives</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((med) => (
            <tr key={med.id}>
              <td>{med.name}</td>
              <td>{med.commonUse}</td>
              <td>{med.sideEffects}</td>
              <td>{med.alternatives}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineTable;