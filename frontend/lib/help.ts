import { formatKes } from "@/lib/money";
import type { StoreSettings } from "@/lib/types";

export type HelpItem = {
  question: string;
  answer: string;
};

export function helpGuide(settings: StoreSettings) {
  const fee = formatKes(settings.deliveryFeeCents);
  const threshold = formatKes(settings.freeDeliveryThresholdCents);
  const store = settings.companyName;
  const pickup = settings.pickupAddress;

  const welcome = `Welcome to ${store}. Whether you are choosing a size, paying with M-Pesa or card, or checking where an order is, start here. These answers match how checkout, delivery, pickup, and returns work on this shop.`;

  const items: HelpItem[] = [
    {
      question: "How do I pay?",
      answer: `Place the order and the store confirms it by email when the order is received. Payment details will be sent through Whatsapp or email.`,
    },
    {
      question: "Can I change, cancel, or get a refund?",
      answer: `After payment, the order moves into packing and cannot be edited on the site. For further adjustments, please send an email or Whatsapp message to the contact that sent you the payment details.`,
    },
    {
      question: "How do returns and exchanges work?",
      answer: `Bring unworn items back to the store within 30 days, in the original packaging with the tags attached, and have the order number with you. We inspect the items before accepting a return or exchange.`,
    },
    {
      question: "What do Membership prices include?",
      answer: `Create an account with your name, email, and a password of at least 8 characters, then sign in as a Member. On selected styles, Members pay the Member price and guests pay the regular price. Order updates for that purchase go to the email on the account.`,
    },
    {
      question: "How do I find an order?",
      answer: `Open Orders in the menu and enter the order number plus the email used at checkout. Orders placed on this browser also appear there. We email that address when the store receives the order, when it is packing, ready for pickup, out for delivery, completed, or cancelled.`,
    },
    {
      question: "When is an order confirmed?",
      answer: `An order is placed when you choose Place order. The store emails you once it is received. That email is the confirmation. Payment details will be sent through the store's Whatsapp or email.`,
    },
    {
      question: "How much does delivery cost?",
      answer: `Delivery is ${fee}. It is free on orders of ${threshold} or more, and pickup has no delivery fee. Your bag and the checkout page show the fee before you pay. Prices are in Kenyan shillings and include applicable taxes, so the checkout total is the amount you pay.`,
    },
    {
      question: "How long does delivery take?",
      answer: `Nairobi delivery takes 1 to 3 days. Delivery outside Nairobi takes 1 to 5 days. We confirm timing after payment. When the status is Out for delivery, keep your phone nearby in case the rider needs you.`,
    },
    {
      question: "How does store pickup work?",
      answer: `Choose Pick-Up at checkout. Collect the order at ${pickup}. Bring your order number. We email you when it is ready, and we hold pickup orders for 5 days.`,
    },

    // {
    //   question: "What if M-Pesa or my card does not go through?",
    //   answer: `Use a Safaricom number starting with 07 or 01. If the prompt expires, or the card is declined, the order is not confirmed and you can start checkout again. If the page says the payment is still processing, wait for the receipt email before you pay a second time.`,
    // },



    {
      question: "Which size should I choose?",
      answer: `Footwear and apparel use standard international sizes. Only sizes and colours that are in stock can be added to the bag.`,
    },
    // {
    //   question: "What does each order status mean?",
    //   answer: `Placed means the order is in. Received means the store has confirmed it. Packing means the team is preparing the order. Ready for pickup means you can collect it. Out for delivery means it is on the way. Completed means it was delivered or collected. Cancelled means it will not be fulfilled.`,
    // },
    {
      question: "Where do my bag and favourites stay?",
      answer: `Your bag and favourites stay on this phone or computer. An order placed here also shows under Orders on this browser. On another device, look it up with the order number and the checkout email.`,
    },
    {
      question: "How do newsletters work?",
      answer: `Enter your email in Become a Member on the homepage to get news and product updates. Use Unsubscribe in that same section to stop them. You can leave the list at any time.`,
    },
    {
      question: "How is my information used?",
      answer: `We use your name, phone, email, and delivery address to fulfil the order. We currently do not process payments on this platform.`,
    },
  ];

  return {
    title: "We're here to help",
    welcome,
    items,
  };
}
