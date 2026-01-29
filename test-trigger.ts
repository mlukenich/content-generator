const response = await fetch('http://localhost:3000/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'Future of AI',
    nicheId: 1,
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
