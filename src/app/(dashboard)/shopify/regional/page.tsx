/*
File description:
This Shopify Regional Performance route exposes the existing regional comparison report under the nested
Shopify navigation hierarchy. It reuses the regional page implementation so Shopify-owned navigation and
the legacy `/regional` route stay behaviorally identical.
*/

export { default } from "../../regional/page";
