/*
File description:
This Shopify Regional Performance route exposes the blank regional placeholder under the nested Shopify
navigation hierarchy. It reuses the regional page implementation so Shopify-owned navigation and the
legacy `/regional` route stay behaviorally identical during the UI reset.
*/

export { default } from "../../regional/page";
