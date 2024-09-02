export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { reviewText } = req.body;
      
      try {
        // Your summarization logic here
        // For example:
        const summary = reviewText.split(' ').slice(0, 20).join(' ') + '...';
        
        res.status(200).json({ summary });
      } catch (error) {
        console.error('Summarization error:', error);
        res.status(500).json({ error: 'Failed to summarize review' });
      }
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }