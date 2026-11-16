/* Verify Guild seed data after worldwide rebrand */
const m = require("mongodb");
(async () => {
  const c = await m.MongoClient.connect(
    "mongodb://127.0.0.1:27017/guild?replicaSet=rs0&directConnection=true",
  );
  const d = c.db();
  console.log(
    "users:", await d.collection("user").countDocuments({}),
    "| services:", await d.collection("services").countDocuments({}),
    "| bookings:", await d.collection("bookings").countDocuments({}),
  );
  const svc = await d.collection("services").findOne({ price: { $ne: null } });
  console.log("sample service:", svc.title, "|", svc.pricingModel, svc.price, svc.currency);
  const prof = await d.collection("providerprofiles").findOne({});
  console.log("provider:", prof.displayName, "|", prof.location.country, "/", prof.location.city);
  const cities = await d.collection("providerprofiles").distinct("location.city");
  console.log("cities:", cities.join(", "));
  const currencies = await d.collection("services").distinct("currency");
  console.log("currencies:", currencies.join(", "));
  await c.close();
})();
