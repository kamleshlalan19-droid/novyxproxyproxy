(() => {
  const clock = document.getElementById('time-clock');
  if (!clock) return;

  const render = () => {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  render();
  setInterval(render, 1000);
})();
