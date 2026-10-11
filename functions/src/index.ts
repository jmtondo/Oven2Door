import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions";
import {Resend} from "resend";

setGlobalOptions({
  maxInstances: 10,
});

// ==========================================
// SEND ORDER CONFIRMATION EMAIL
// ==========================================

export const sendOrderConfirmation = onRequest(
  {
    region: "asia-southeast1",
  },
  async (req, res) => {

    // ========================================
    // CORS
    // ========================================

    res.set(
      "Access-Control-Allow-Origin",
      "*",
    );

    res.set(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS",
    );

    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type",
    );

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({
        error: "Method not allowed",
      });

      return;
    }

    try {

      // ========================================
      // RESEND API KEY
      // ========================================

      const apiKey =
        process.env.RESEND_API_KEY;

      if (!apiKey) {
        res.status(500).json({
          error:
            "RESEND_API_KEY is not configured.",
        });

        return;
      }

      // ========================================
      // REQUEST DATA
      // ========================================

      const {
        email,
        firstName,
        orderNumber,
        paymentMethod,
        paymentStatus,
        items,
        subtotal,
        deliveryFee,
        discount,
        total,
      } = req.body;

      // ========================================
      // VALIDATION
      // ========================================

      if (
        !email ||
        !firstName ||
        !orderNumber ||
        !paymentMethod ||
        !items ||
        subtotal === undefined ||
        deliveryFee === undefined ||
        discount === undefined ||
        total === undefined
      ) {
        res.status(400).json({
          error:
            "Missing required order information.",
        });

        return;
      }

      // ========================================
      // CREATE ITEM HTML
      // ========================================

      const itemsHtml =
        items
          .map(
            (item: {
              productName: string;
              quantity: number;
              unitPrice: number;
              subtotal: number;
            }) => `
              <tr>
                <td
                  style="
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                  "
                >
                  ${item.productName}
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: center;
                    border-bottom: 1px solid #eee;
                  "
                >
                  ${item.quantity}
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    border-bottom: 1px solid #eee;
                  "
                >
                  ₱${Number(item.subtotal).toFixed(2)}
                </td>
              </tr>
            `,
          )
          .join("");

      // ========================================
      // PAYMENT METHOD DISPLAY
      // ========================================

      const paymentMethodText =
        paymentMethod === "card"
          ? "Maya Online Payment"
          : "Cash on Delivery";

      // ========================================
      // PAYMENT STATUS DISPLAY
      // ========================================

      const paymentStatusText =
        paymentStatus === "paid"
          ? "Paid"
          : "Pending";

      // ========================================
      // SEND EMAIL
      // ========================================

      const resend =
        new Resend(apiKey);

      const {data, error} =
        await resend.emails.send({

          from:
              "Oven2Door <orders@oven2door.shop>",

          to:
            [email],

          subject:
            `Oven2Door Order Confirmation - ${orderNumber}`,

          html: `
            <div
              style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: 0 auto;
                padding: 30px;
                color: #222;
              "
            >

              <h1
                style="
                  margin-bottom: 5px;
                "
              >
                Oven2Door
              </h1>

              <h2>
                Order Confirmation
              </h2>

              <p>
                Hello ${firstName},
              </p>

              <p>
                Thank you for ordering from
                Oven2Door!
              </p>

              <p>
                Your order
                <strong>${orderNumber}</strong>
                has been received successfully.
              </p>

              <hr>

              <h3>
                Order Details
              </h3>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-collapse: collapse;
                "
              >

                <thead>
                  <tr>
                    <th
                      style="
                        text-align: left;
                        padding: 10px 0;
                      "
                    >
                      Item
                    </th>

                    <th
                      style="
                        text-align: center;
                        padding: 10px 0;
                      "
                    >
                      Qty
                    </th>

                    <th
                      style="
                        text-align: right;
                        padding: 10px 0;
                      "
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${itemsHtml}
                </tbody>

              </table>

              <br>

              <table
                width="100%"
                style="
                  border-collapse: collapse;
                "
              >

                <tr>
                  <td>
                    Subtotal
                  </td>

                  <td
                    style="text-align: right;"
                  >
                    ₱${Number(subtotal).toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td>
                    Delivery Fee
                  </td>

                  <td
                    style="text-align: right;"
                  >
                    ₱${Number(deliveryFee).toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td>
                    Discount
                  </td>

                  <td
                    style="text-align: right;"
                  >
                    -₱${Number(discount).toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding-top: 12px;
                      font-size: 18px;
                      font-weight: bold;
                    "
                  >
                    Total
                  </td>

                  <td
                    style="
                      padding-top: 12px;
                      text-align: right;
                      font-size: 18px;
                      font-weight: bold;
                    "
                  >
                    ₱${Number(total).toFixed(2)}
                  </td>
                </tr>

              </table>

              <hr>

              <h3>
                Payment
              </h3>

              <p>
                <strong>Method:</strong>
                ${paymentMethodText}
              </p>

              <p>
                <strong>Status:</strong>
                ${paymentStatusText}
              </p>

              <br>

              <p>
                Thank you for choosing Oven2Door!
              </p>

              <p
                style="
                  color: #777;
                  font-size: 13px;
                "
              >
                This is an automated email from
                the Oven2Door ordering system.
              </p>

            </div>
          `,
        });

      // ========================================
      // RESEND ERROR
      // ========================================

      if (error) {

        console.error(
          "Resend order email error:",
          error,
        );

        res.status(400).json({

          error:
            "Failed to send order confirmation email.",

          details:
            error,
        });

        return;
      }

      // ========================================
      // SUCCESS
      // ========================================

      console.log(
        "Order confirmation email sent:",
        {
          emailId: data?.id,
          orderNumber,
          email,
        },
      );

      res.status(200).json({

        success:
          true,

        emailId:
          data?.id,

        orderNumber,
      });

    } catch (error) {

      console.error(
        "Send order confirmation error:",
        error,
      );

      res.status(500).json({

        error:
          "Unable to send order confirmation email.",
      });
    }
  },
);