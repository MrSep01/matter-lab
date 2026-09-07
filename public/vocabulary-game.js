// Vocabulary practice stays independent of lesson XP and simulation state.
(() => {
  const el = id => document.getElementById(id);
  const shuffle = items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const inGroup = group => vocabularyCards.filter(card => group === 'all' || card.group === group);
  document.querySelectorAll('[data-vocab-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-vocab-mode]').forEach(control => {
        const active = control === button;
        control.setAttribute('aria-pressed', String(active));
        el(control.getAttribute('aria-controls')).hidden = !active;
      });
    });
  });

  const known = new Set(), tricky = new Set();
  let deck = inGroup('all'), cardIndex = 0, flipped = false, seenAnswer = false, reviewing = false;
  function renderCard() {
    const card = deck[cardIndex];
    const showsTerm = (el('flash-direction').value === 'term') !== flipped;
    el('flash-count').textContent = `${reviewing ? 'Tricky cards · ' : ''}Card ${cardIndex + 1} / ${deck.length}`;
    const chosen = inGroup(el('flash-group').value);
    el('flash-known').textContent = `${chosen.filter(item => known.has(item.term)).length} / ${chosen.length} words marked known`;
    el('flash-side').textContent = showsTerm ? 'SCIENCE WORD' : 'MEANING';
    el('flash-face').textContent = showsTerm ? card.term : card.definition;
    el('flash-flip').dataset.face = showsTerm ? 'term' : 'meaning';
    el('flash-flip').setAttribute('aria-pressed', String(flipped));
    const action = showsTerm ? 'Tap to see the meaning' : 'Tap to see the science word';
    el('flash-cue').textContent = action;
    el('flash-flip').setAttribute('aria-label', `${showsTerm ? card.term : card.definition}. ${action}.`);
    for (const [id, marked] of [['flash-know', known.has(card.term)], ['flash-again', tricky.has(card.term)]]) {
      el(id).disabled = !seenAnswer;
      el(id).setAttribute('aria-pressed', String(marked));
    }
    const trickyCount = chosen.filter(item => tricky.has(item.term)).length;
    el('flash-review').disabled = !reviewing && trickyCount === 0;
    el('flash-review').textContent = reviewing ? 'Back to all chosen cards' : `Review tricky cards (${trickyCount})`;
    el('flash-review').setAttribute('aria-pressed', String(reviewing));
  }
  function resetFace(message = 'Say the answer, then flip the card to check.') {
    flipped = false;
    seenAnswer = false;
    el('flash-feedback').textContent = message;
    renderCard();
  }
  el('flash-flip').addEventListener('click', () => {
    flipped = !flipped;
    seenAnswer = true;
    el('flash-feedback').textContent = 'How did you do? Mark this word, then choose Next.';
    renderCard();
  });
  el('flash-group').addEventListener('change', () => {
    deck = inGroup(el('flash-group').value);
    cardIndex = 0;
    reviewing = false;
    resetFace();
  });
  el('flash-direction').addEventListener('change', () => resetFace());
  el('flash-shuffle').addEventListener('click', () => {
    deck = shuffle(deck);
    cardIndex = 0;
    resetFace('Cards shuffled. Say the answer before you flip.');
  });
  for (const [id, step] of [['flash-prev', -1], ['flash-next', 1]]) {
    el(id).addEventListener('click', () => {
      cardIndex = (cardIndex + step + deck.length) % deck.length;
      resetFace();
    });
  }
  function markCard(isKnown) {
    if (!seenAnswer) return;
    const term = deck[cardIndex].term;
    (isKnown ? known : tricky).add(term);
    (isKnown ? tricky : known).delete(term);
    el('flash-feedback').textContent = isKnown ? `${term}: marked known. Ready for the next card?` : `${term}: saved to your tricky cards. You can practise it again.`;
    renderCard();
  }
  el('flash-know').addEventListener('click', () => markCard(true));
  el('flash-again').addEventListener('click', () => markCard(false));
  el('flash-review').addEventListener('click', () => {
    const chosen = inGroup(el('flash-group').value);
    const nextDeck = reviewing ? chosen : chosen.filter(card => tricky.has(card.term));
    if (!nextDeck.length) return;
    reviewing = !reviewing;
    deck = nextDeck;
    cardIndex = 0;
    resetFace(reviewing ? 'A smaller set, just for the words you want to practise.' : 'Back to your chosen group. Your known words are remembered.');
  });

  let round = [], questionIndex = 0, score = 0, missed = [], answered = false, retryRound = false, quizAnswers = [];
  function renderQuestion(focus = false) {
    const card = round[questionIndex];
    answered = false;
    el('vocab-quiz-summary').hidden = true;
    el('vocab-quiz-round').hidden = false;
    el('vocab-quiz-count').textContent = `${retryRound ? 'Retry · ' : ''}Question ${questionIndex + 1} / ${round.length}`;
    el('vocab-quiz-progress').max = round.length;
    el('vocab-quiz-progress').value = questionIndex;
    el('vocab-quiz-question').textContent = card.definition;
    el('vocab-quiz-feedback').hidden = true;
    el('vocab-quiz-feedback').textContent = '';
    el('vocab-quiz-next').disabled = true;
    el('vocab-quiz-next').textContent = questionIndex === round.length - 1 ? 'See my result →' : 'Next question →';
    const choices = el('vocab-quiz-choices');
    choices.replaceChildren();
    for (const term of shuffle([card.term, ...card.distractors])) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = term;
      button.addEventListener('click', () => {
        // Lock the question before updating feedback, including repeated clicks.
        if (answered) return;
        answered = true;
        quizAnswers[questionIndex] = term;
        const correct = term === card.term;
        if (correct) score++;
        else missed.push(card);
        for (const choice of choices.children) {
          if (choice.textContent === card.term) {
            choice.classList.add('is-correct');
            choice.textContent = `✓ ${card.term}`;
          } else if (choice === button) {
            choice.classList.add('is-wrong');
            choice.textContent = `↺ ${term}`;
          }
          choice.disabled = true;
        }
        el('vocab-quiz-feedback').textContent = correct ? `Correct! The word is ${card.term.toLowerCase()}.` : `The matching word is ${card.term.toLowerCase()}. This word is saved for another try at the end.`;
        el('vocab-quiz-feedback').dataset.result = correct ? 'correct' : 'retry';
        el('vocab-quiz-feedback').hidden = false;
        el('vocab-quiz-progress').value = questionIndex + 1;
        el('vocab-quiz-next').disabled = false;
      });
      choices.appendChild(button);
    }
    if (focus) el('vocab-quiz-question').focus({preventScroll: true});
  }
  function startRound(retryCards, focus = true) {
    retryRound = Boolean(retryCards);
    round = shuffle(retryCards || inGroup(el('vocab-quiz-group').value)).slice(0, 10);
    questionIndex = 0;
    score = 0;
    missed = [];
    quizAnswers = [];
    renderQuestion(focus);
  }
  el('vocab-quiz-next').addEventListener('click', () => {
    if (!answered) return;
    if (questionIndex < round.length - 1) {
      questionIndex++;
      renderQuestion(true);
      return;
    }
    el('vocab-quiz-round').hidden = true;
    el('vocab-quiz-summary').hidden = false;
    el('vocab-quiz-score').textContent = `${score} / ${round.length} correct ${retryRound ? 'in your retry' : 'on your first try'}`;
    el('vocab-quiz-message').textContent = missed.length ? `Keep building your word power. Practise these next: ${missed.map(card => card.term).join(', ')}.` : 'All words matched! Try explaining one change of state using particles and energy.';
    el('vocab-quiz-retry').hidden = missed.length === 0;
    el('vocab-quiz-score').tabIndex = -1;
    el('vocab-quiz-score').focus({preventScroll: true});
  });
  el('vocab-quiz-retry').addEventListener('click', () => {
    if (missed.length) startRound([...missed]);
  });
  for (const id of ['vocab-quiz-start', 'vocab-quiz-new']) el(id).addEventListener('click', () => startRound());
  el('vocab-quiz-group').addEventListener('change', () => startRound());
  window.vocabularyProgress = {
    capture: () => ({known: [...known], tricky: [...tricky], deck: deck.map(c => c.term), cardIndex, flipped, seenAnswer, reviewing,
      group: el('flash-group').value, direction: el('flash-direction').value,
      mode: document.querySelector('[data-vocab-mode][aria-pressed="true"]').dataset.vocabMode,
      quizGroup: el('vocab-quiz-group').value, round: round.map(c => c.term), questionIndex, answers: [...quizAnswers], retryRound,
      summary: !el('vocab-quiz-summary').hidden}),
    restore: data => {
      if (!data || typeof data !== 'object') return;
      const byTerm = term => vocabularyCards.find(c => c.term === term);
      const validTerms = values => Array.isArray(values) ? [...new Set(values)].filter(t => byTerm(t)) : [];
      known.clear(); tricky.clear(); validTerms(data.known).forEach(t => known.add(t)); validTerms(data.tricky).filter(t => !known.has(t)).forEach(t => tricky.add(t));
      el('flash-group').value = ['all','particles','energy','changes'].includes(data.group) ? data.group : 'all';
      el('flash-direction').value = data.direction === 'meaning' ? 'meaning' : 'term';
      deck = validTerms(data.deck).map(byTerm); if (!deck.length) deck = inGroup(el('flash-group').value);
      cardIndex = Math.max(0, Math.min(deck.length - 1, Math.trunc(Number(data.cardIndex)) || 0));
      flipped = data.flipped === true; seenAnswer = data.seenAnswer === true; reviewing = data.reviewing === true;
      renderCard();
      el('vocab-quiz-group').value = ['all','particles','energy','changes'].includes(data.quizGroup) ? data.quizGroup : 'all';
      const savedRound = validTerms(data.round).slice(0,10).map(byTerm);
      if (savedRound.length) {
        round = savedRound; questionIndex = Math.max(0, Math.min(round.length - 1, Math.trunc(Number(data.questionIndex)) || 0));
        quizAnswers = round.map((card,i) => [card.term,...card.distractors].includes(data.answers?.[i]) ? data.answers[i] : null);
        // A round cannot skip an unanswered question, even after a schema change.
        const gap = quizAnswers.findIndex(a => !a); if (gap >= 0) questionIndex = Math.min(questionIndex,gap);
        score = 0; missed = []; retryRound = data.retryRound === true;
        for(let i=0;i<questionIndex;i++){if(quizAnswers[i]===round[i].term)score++;else missed.push(round[i]);}
        const currentAnswer = quizAnswers[questionIndex]; renderQuestion();
        if(currentAnswer) Array.from(el('vocab-quiz-choices').children).find(b=>b.textContent===currentAnswer)?.click();
        if(data.summary && answered && questionIndex===round.length-1)el('vocab-quiz-next').click();
      }
      const mode = ['read','cards','quiz'].includes(data.mode) ? data.mode : 'read';
      document.querySelector('[data-vocab-mode="'+mode+'"]').click();
    },
  };
  renderCard();
  startRound(undefined, false);
})();
