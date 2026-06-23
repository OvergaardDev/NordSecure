import { StarRating } from './StarRating'

interface ReviewCardProps {
  author: string
  rating: number
  text: string
  createdAt: string | Date
}

export function ReviewCard({ author, rating, text, createdAt }: ReviewCardProps) {
  const date = new Date(createdAt).toLocaleDateString('en-DK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-white text-sm">{author}</p>
          <StarRating rating={rating} />
        </div>
        <time className="text-slate-500 text-xs whitespace-nowrap">{date}</time>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
    </article>
  )
}
