import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

type Movie = {
  id: string
  title: string
  director: string
  releaseYear: number
  genre: string
  ratings: number[]
}

let movies: Movie[] = []

app.post('/movies', async (c) => {
  const body = await c.req.json()
  const { id, title, director, releaseYear, genre } = body

  if (!id || !title || !director || !releaseYear || !genre) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  if (movies.find(m => m.id === id)) {
    return c.json({ error: 'Movie with this ID already exists' }, 400)
  }

  movies.push({ id, title, director, releaseYear, genre, ratings: [] })
  return c.json({ message: 'Movie added successfully' }, 201)
})

app.patch('/movies/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const movie = movies.find(m => m.id === id)
  if (!movie) return c.json({ error: 'Movie not found' }, 404)

  Object.assign(movie, body)
  return c.json({ message: 'Movie updated successfully' }, 200)
})

app.get('/movies/:id', (c) => {
  const id = c.req.param('id')
  const movie = movies.find(m => m.id === id)
  return movie ? c.json(movie) : c.json({ error: 'Movie not found' }, 404)
})

app.delete('/movies/:id', (c) => {
  const id = c.req.param('id')
  const initialLength = movies.length
  movies = movies.filter(m => m.id !== id)
  return c.json({ message: initialLength > movies.length ? 'Movie deleted' : 'Movie not found' })
})

app.post('/movies/:id/rating', async (c) => {
  const id = c.req.param('id')
  const { rating } = await c.req.json()
  const movie = movies.find(m => m.id === id)
  if (!movie) return c.json({ error: 'Movie not found' }, 404)
  if (rating < 1 || rating > 5) return c.json({ error: 'Invalid rating' }, 400)

  movie.ratings.push(rating)
  return c.json({ message: 'Rating added successfully' })
})

app.get('/movies/:id/rating', (c) => {
  const id = c.req.param('id')
  const movie = movies.find(m => m.id === id)
  if (!movie) return c.json({ error: 'Movie not found' }, 404)
  if (movie.ratings.length === 0) return new Response(null, { status: 204 }) // No body in 204 response

  const avgRating = movie.ratings.reduce((a, b) => a + b, 0) / movie.ratings.length
  return c.json({ averageRating: avgRating })
})

app.get('/top-rated', (c) => {
  if (movies.length === 0) return c.json({ error: 'No movies found' }, 404)

  // Filter movies that have at least one rating
  const ratedMovies = movies.filter(m => m.ratings && m.ratings.length > 0)
  if (ratedMovies.length === 0) return c.json({ error: 'No rated movies found' }, 404)

  // Sort movies by average rating in descending order
  const sortedMovies = ratedMovies.sort((a, b) => {
    const avgA = a.ratings.reduce((sum, r) => sum + r, 0) / a.ratings.length
    const avgB = b.ratings.reduce((sum, r) => sum + r, 0) / b.ratings.length
    return avgB - avgA
  })

  return c.json(sortedMovies)
})

app.get('/movies/genre/:genre', (c) => {
  const genre = c.req.param('genre')
  const filteredMovies = movies.filter(m => m.genre.toLowerCase() === genre.toLowerCase())
  return filteredMovies.length ? c.json(filteredMovies) : c.json({ error: 'No movies found for this genre' }, 404)
})

app.get('/movies/director/:director', (c) => {
  const director = c.req.param('director')
  const filteredMovies = movies.filter(m => m.director.toLowerCase() === director.toLowerCase())
  return filteredMovies.length ? c.json(filteredMovies) : c.json({ error: 'No movies found for this director' }, 404)
})

app.get('/search/:keyword', (c) => {
  const keyword = c.req.param('keyword');
  if (!keyword) return c.json({ error: "Keyword query parameter is required" }, 400);

  const lowerKeyword = keyword.toLowerCase().trim();

  if (movies.length === 0) {
      console.log("No movies available in the database.");
      return c.json({ error: "No movies found" }, 404);
  }
  const filteredMovies = movies.filter((m) => {
      console.log("Checking movie: ${m.title.toLowerCase()}"); 
      return m.title.toLowerCase().includes(lowerKeyword);
  });

  if (filteredMovies.length === 0) {
      console.log("No matching movies found."); 
      return c.json({ error: "No movies found" }, 404);
  }

  return c.json(filteredMovies);
});

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})