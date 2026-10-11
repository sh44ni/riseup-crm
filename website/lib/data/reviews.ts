import type { Review } from '@/types/review';

export interface EnrichedReview extends Review {
  neighborhood?: string;
  projectType?: string;
}

export const reviews: EnrichedReview[] = [
  {
    author: 'T Hobart',
    location: 'Oceanside, CA',
    neighborhood: 'Oceanside, CA',
    projectType: 'Roof Replacement',
    rating: 5,
    text: 'They are professional roofers, fair, and competent. They completely removed and replaced both the house and guesthouse roof - 3000 sq ft. I received 3 estimates and Rise Up Roofing was the middle quote. As a general contractor myself, they exceeded my expectations with their craft, cleanup, and communication.',
    source: 'google',
    serviceCategory: 'residential',
    date: 'May 2025',
    ownerReply:
      "Thank you so much for your detailed and thoughtful review. We're thrilled to hear that you were satisfied with the service you received from our team. It's wonderful to know that our communication, professionalism, and thoroughness stood out to you. Edith and the team strive to ensure that every project runs smoothly and meets our clients' expectations. We're glad we could address the issues with the roof effectively and leave you with peace of mind. Your feedback is greatly appreciated, and we're here for any future roofing or construction needs you may have. Thank you once again for choosing Rise Up Roofing and Construction Inc.",
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Steve Ponce',
    location: 'San Diego, CA',
    neighborhood: 'San Diego, CA',
    projectType: 'Roofing & Construction',
    rating: 5,
    text: 'Rise up Roofing and Construction is by far an excellent roofing company who takes pride in their quality of work and they go out of their way to make sure the owner/customer is satisfied!! Edith (owner), is very involved and takes the time to make sure everything is done right.',
    source: 'google',
    serviceCategory: 'residential',
    date: 'June 2025',
    ownerReply:
      'Hey Steve! Wow, thank you so much for the amazing review! We’re really grateful you chose Rise Up Roofing, and it was truly a pleasure working with you. Edith and Luis were both so happy to hear your kind words—it means the world to us when our customers feel taken care of. We’re especially glad we could hook you up with that military discount—thank you again for your service! If you ever need anything down the road, big or small, just reach out. We’ve got you covered! Take care and talk soon, —The Rise Up Roofing',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Gustavo Bernal',
    location: 'Oceanside, CA',
    neighborhood: 'Oceanside, CA',
    projectType: 'Roof Leak Repair & Replacement',
    rating: 5,
    text: 'The roof of our duplex was leaking and needed to be replaced. I called on a Tuesday and they went out the same day to provide a quote. The weather gave a small window to complete the work, Thursday to Tuesday. The team was well organized, fast, and delivered top-notch quality.',
    source: 'google',
    serviceCategory: 'repair',
    date: 'August 2023',
    ownerReply:
      "Thank you so much for sharing your experience! We're glad we could respond quickly and get your roof taken care of before the storm hit. Timing was everything on this one, and our team was proud to deliver fast, quality work while keeping things organized and professional. We truly appreciate your trust in Rise Up Roofing! —The Rise Up Roofing & Construction Team",
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Damian Enrique Diaz',
    location: 'Carlsbad, CA',
    neighborhood: 'Carlsbad, CA',
    projectType: 'Roofing & Construction',
    rating: 5,
    text: 'Rise Up Roofing and Construction definitely rises above the competition. They are extremely professional, knowledgeable, and get the job done right and a timely manner. I highly recommend this company.',
    source: 'google',
    serviceCategory: 'commercial',
    date: 'April 2025',
    ownerReply:
      'Hey Mr. Diaz, We really appreciate you taking the time to leave such a thoughtful review—thank you! It means a lot to our team to know our work stood out. We take pride in being professional, staying on schedule, and making sure the job’s done right, so it’s great to hear that came through in your experience. Thanks again for the recommendation! If you ever need us in the future, we’ve got your back. —Your friends at Rise Up Roofing and Construction',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Rosanna Cesena',
    location: 'Oceanside, CA',
    neighborhood: 'Oceanside, CA',
    projectType: 'Roof Replacement',
    rating: 5,
    text: 'good work fast great crew fantastic owner and ana thank you along with everyone else. great respect and great attitudes.',
    source: 'google',
    serviceCategory: 'residential',
    date: 'March 2024',
    ownerReply:
      'Rosanna, thank you so much for the feedback and for taking the time to review us. We value our team and are glad we delivered the quality service our clients expect. Let us know if we can be of any assistance in the future, and thank you again for the 5-Star review.',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Alexandria V',
    location: 'Vista, CA',
    neighborhood: 'Vista, CA',
    projectType: 'Roofing Services',
    rating: 5,
    text: 'I haven’t encounter before such a great company that is honest, affordable prices and high quality in their services. Thank You Edith you have a great team! 🙏',
    source: 'google',
    serviceCategory: 'residential',
    date: 'July 2025',
    ownerReply:
      'Thank you so much for the kind words! It truly means a lot to us. We’re so glad you had a great experience, and Edith and the entire team are grateful for your trust. We’ll always be here to provide honest, high-quality work at fair prices! —The Rise Up Roofing & Construction Team 🙏',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Daved Garcia',
    location: 'San Diego, CA',
    neighborhood: 'San Diego, CA',
    projectType: 'Roofing & Construction',
    rating: 5,
    text: 'Excellent service, highly recommended, efficient and fast. Very satisfied with their work.',
    source: 'google',
    serviceCategory: 'residential',
    date: 'June 2025',
    ownerReply:
      "Thank you so much for your feedback! We're delighted to hear you were happy with our work. We always strive to provide fast, efficient, and high-quality service. We're here for you! —The Rise Up Roofing & Construction Team",
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Kathy V',
    location: 'Oceanside, CA',
    neighborhood: 'Oceanside, CA',
    projectType: 'Roofing Services',
    rating: 5,
    text: '5-star rating for Rise Up Roofing and Construction! Excellent service and quality work.',
    source: 'google',
    serviceCategory: 'residential',
    date: 'August 2025',
    ownerReply:
      'Thank you so much for the 5 stars, Kathy! 🌟 We truly appreciate your support—it means a lot to us. Don’t hesitate to reach out if you ever need anything! —The Rise Up Roofing & Construction Team',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
  {
    author: 'Javier Melchor',
    location: 'Oceanside, CA',
    neighborhood: 'Oceanside, CA',
    projectType: 'Roofing Services',
    rating: 5,
    text: 'Great experience with Rise Up Roofing and Construction. 5 stars!',
    source: 'google',
    serviceCategory: 'residential',
    date: 'August 2025',
    ownerReply:
      "Big thanks for the 5-star rating, Javier! ⭐️ We're grateful for your support and always here if you need us down the road. —The Rise Up Roofing & Construction Team",
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I',
  },
];

export function getAverageRating(reviewList: Review[] = reviews): number {
  if (!reviewList.length) return 5.0;
  const total = reviewList.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviewList.length) * 10) / 10;
}

export function getReviewCount(reviewList: Review[] = reviews): number {
  return reviewList.length;
}
