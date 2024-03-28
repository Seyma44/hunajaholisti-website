import React, { ChangeEventHandler, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  PayPalButtons,
  usePayPalScriptReducer,
  FUNDING,
} from "@paypal/react-paypal-js";
import Spinner from "../components/Spinner";
import { CartContext } from "../components/CartContext";
import { LanguageContext } from "../components/LanguageContext";
import { collection, addDoc } from "firebase/firestore";
import db from "../firebase";

const Checkout = () => {
  type Errors = {
    name?: string;
    address?: string;
    zip?: string;
    city?: string;
    email?: string;
    phone?: string;
    message?: string;
  };

  const [orderID, setOrderID] = useState(null);
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    address: "",
    zip: "",
    city: "",
    email: "",
    phone: "",
    message: "",
  });
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { state, dispatch } = useContext(CartContext);
  const totalAmount = state.total;
  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();
  const [errors, setErrors] = useState<Errors>({});

  const { language } = useContext(LanguageContext) as {
    language: string;
    setLanguage: (language: string) => void;
  };
  const addOrderToFirestore = async () => {
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        name: customerDetails.name,
        address: customerDetails.address,
        zip: customerDetails.zip,
        city: customerDetails.city,
        email: customerDetails.email,
        phone: customerDetails.phone,
        message: customerDetails.message,
        totalAmount,
        products: state.cartItems,
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    //* Form validation
    let formErrors: Errors = {};

    if (language === "fi") {
      if (customerDetails.name === "") {
        formErrors.name = "Kirjoita nimesi";
      }
      if (customerDetails.address === "") {
        formErrors.address = "Kirjoita osoitteesi";
      }
      if (customerDetails.zip === "") {
        formErrors.zip = "Kirjoita postinumerosi";
      }
      if (customerDetails.city === "") {
        formErrors.city = "Kirjoita kaupunkisi";
      }
      if (customerDetails.email === "") {
        formErrors.email = "Kirjoita sähköpostiosoitteesi";
      }
      if (customerDetails.phone === "") {
        formErrors.phone = "Kirjoita puhelinnumerosi";
      }
    } else {
      if (customerDetails.name === "") {
        formErrors.name = "Name is required";
      }
      if (customerDetails.address === "") {
        formErrors.address = "Address is required";
      }
      if (customerDetails.zip === "") {
        formErrors.zip = "Zip is required";
      }
      if (customerDetails.city === "") {
        formErrors.city = "City is required";
      }
      if (customerDetails.email === "") {
        formErrors.email = "Email is required";
      }
      if (customerDetails.phone === "") {
        formErrors.phone = "Phone is required";
      }
    }
    setErrors(formErrors);

    //* If there are errors, stop the form from submitting
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    setLoading(true);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    //* Fetch the secret from the Netlify function
    const response = await fetch("/.netlify/functions/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: totalAmount, customerDetails }),
    });
    const data = await response.json();
    const clientSecret = data.clientSecret;
    const cardElement = elements.getElement(CardElement);

    if (cardElement) {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        alert(result.error.message);
        setLoading(false);
      } else {
        if (result.paymentIntent.status === "succeeded") {
          console.log("Payment succeeded!");
          localStorage.setItem("userHasPurchased", "true");
          addOrderToFirestore();
          dispatch({ type: "CLEAR" });
          navigate("/success");
          setLoading(false);
        }
      }
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerDetails({
      ...customerDetails,
      [event.target.name]: event.target.value,
    });
  };

  const handleApprove = (data: any, actions: any) => {
    return actions.order.capture().then((details: any) => {
      addOrderToFirestore();
      dispatch({ type: "CLEAR" });
      navigate("/success");
    });
  };

  if (isPending) return <Spinner />;

  return (
    <>
      <div className="py-10"></div>
      <div className="container mx-auto px-4 pt-16">
        <div className="p-6 backdrop-blur bg-white bg-opacity-5 shadow-md rounded-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">
            {language === "fi" ? "Kassa" : "Checkout"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-white">
            <div className="p-4 border border-gray-300 rounded-md bg-white">
              <CardElement className="p-2 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Nimi:" : "Name:"}
              </label>
              <input
                name="name"
                type="text"
                value={customerDetails.name}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Postiosoite:" : "Address:"}
              </label>
              <input
                name="address"
                type="text"
                value={customerDetails.address}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.address && (
                <p className="mt-2 text-sm text-red-600">{errors.address}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Postinumero:" : "Zip:"}
              </label>
              <input
                name="zip"
                type="number"
                value={customerDetails.zip}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.zip && (
                <p className="mt-2 text-sm text-red-600">{errors.zip}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Kaupunki:" : "City:"}
              </label>
              <input
                name="city"
                type="text"
                value={customerDetails.city}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.city && (
                <p className="mt-2 text-sm text-red-600">{errors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Sähköposti:" : "Email:"}
              </label>
              <input
                name="email"
                type="email"
                value={customerDetails.email}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Puhelinnumero:" : "Phone:"}
              </label>
              <input
                name="phone"
                type="tel"
                value={customerDetails.phone}
                onChange={handleInputChange}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-100">
                {language === "fi" ? "Viesti:" : "Message:"}
              </label>
              <textarea
                name="message"
                value={customerDetails.message}
                onChange={
                  handleInputChange as unknown as ChangeEventHandler<HTMLTextAreaElement>
                }
                className="mt-1 p-2 w-full border border-gray-300 rounded-md bg-white bg-opacity-20"
              />
            </div>
            <button
              type="submit"
              disabled={!stripe || loading}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300 w-full md:w-auto flex justify-center items-center"
              style={{ minWidth: "150px" }}
            >
              {loading ? (
                <Spinner />
              ) : language === "fi" ? (
                "Maksa"
              ) : (
                "Proceed to Pay"
              )}
            </button>

            {/* <div className="mt-4">
                            <h3 className="mb-3 text-gray-100 mt-4">
                                {language === "fi"
                                    ? "Tai maksa PayPalilla:"
                                    : "Or Pay with PayPal:"}
                            </h3>
                            <PayPalButtons
                                fundingSource={FUNDING.PAYPAL}
                                createOrder={(data, actions) => {
                                    return actions.order.create({
                                        purchase_units: [
                                            {
                                                amount: {
                                                    value: (
                                                        Number(totalAmount) /
                                                        100
                                                    ).toFixed(2),
                                                },
                                            },
                                        ],
                                    });
                                }}
                                onApprove={handleApprove}
                            />
                        </div> */}
          </form>
        </div>
      </div>
      <div className="py-5"></div>
    </>
  );
};

export default Checkout;
