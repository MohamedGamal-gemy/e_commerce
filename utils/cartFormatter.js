const formatCart = (cartDoc) => {
console.log("cartDoc",cartDoc);

    if (!cartDoc)
    return {
      items: [],
      subtotal: 0,
      totalItems: 0,
    };

  const items = cartDoc.items.map((item) => ({
    product: item.product
      ? {
          _id: item.product._id,
          title: item.product.title,
          slug: item.product.slug,
          price: item.product.price,
        }
      : null,

    variant: item.variant
      ? {
          _id: item.variant._id,
          color: item.variant.color,
          image: item.variant.images?.[0]?.url || null,
        }
      : null,

    size: item.size,
    quantity: item.quantity,
    price: item.price,
  }));

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    _id: cartDoc._id,
    sessionId: cartDoc.sessionId,
    items,
    totalItems,
    subtotal,
  };
};

module.exports = formatCart;
