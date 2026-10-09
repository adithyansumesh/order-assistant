import React from "react";

interface ExampleChipsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "What is the status of order ORD-1025?",
  "How many orders were cancelled?",
  "What was the total revenue from Electronics in August?",
  "Which customer has spent the most?",
  "Which orders are still pending?",
  "What is the total revenue in September?",
  "Show all orders from Chennai",
  "How many orders were placed in July?",
  "What products did Sneha Pillai order?",
  "What is the average order value?",
];

export const ExampleChips: React.FC<ExampleChipsProps> = ({ onSelect, disabled }) => {
  return (
    <div className="chips-grid">
      {EXAMPLE_QUESTIONS.map((question, idx) => (
        <button
          key={idx}
          className="example-chip"
          onClick={() => onSelect(question)}
          disabled={disabled}
          type="button"
        >
          {question}
        </button>
      ))}
    </div>
  );
};
