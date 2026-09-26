# Paiements v5 — activation et exploitation

## État livré

Intégration Stripe Checkout hébergé, paiements carte en EUR, Party Pass, abonnements mensuel/annuel, achats séparés, portail client et webhooks. Aucun SDK Stripe côté navigateur ; les numéros de carte ne traversent pas le jeu. Les appels serveur sont fixés à `https://api.stripe.com/v1/`, version `2025-04-30.basil`.

Les tests utilisent un fournisseur HTTP simulé. Ils ne prouvent pas la configuration du compte marchand, la livraison des e-mails Stripe, les cas 3-D Secure réels, les obligations fiscales ou les versements bancaires. Aucun encaissement réel n’a été fait.

## Configuration obligatoire

Conserver les secrets dans les variables d’environnement du déploiement, jamais dans Git ni dans le ZIP. Utiliser un site/base distincts pour les essais Stripe. Ne pas transformer les clients Stripe de test en clients live dans la même base.

| Variable | Valeur attendue |
| --- | --- |
| `CKK_APP_ORIGIN` | Origine HTTPS publique exacte du jeu, sans chemin ni barre finale |
| `CKK_BILLING_MODE` | `off` par défaut ; puis `test` ou `live` |
| `STRIPE_SECRET_KEY` | Clé secrète `sk_test_…` ou `sk_live_…` correspondant au mode |
| `STRIPE_WEBHOOK_SECRET` | Secret `whsec_…` du point de terminaison de cet environnement |
| `CKK_LEGAL_NAME` | Identité réelle du vendeur |
| `CKK_SUPPORT_EMAIL` | Adresse de support effectivement suivie |
| `CKK_TERMS_URL` | URL HTTPS des vraies conditions de vente publiées |
| `CKK_BILLING_READY` | `1` uniquement après préparation et validation des informations de vente |
| `CKK_CHECKOUT_OPEN` | `1` pour ouvrir les nouveaux achats ; `0` pour les fermer sans retirer les droits existants ni couper webhooks/portail |

Il faut toutes les valeurs de configuration pour les accès et le traitement Stripe. **En cas de pause des ventes, ne pas supprimer les clés ni passer le mode sur off : mettre seulement `CKK_CHECKOUT_OPEN=0`.** Les abonnements déjà ouverts continuent autrement à exister chez Stripe. Redéployer après modification des variables de production.

Les prix sont calculés par le serveur depuis `lib/catalog.ts`, sans prix envoyé par le client. Les Price/Product Stripe sont créés par Checkout à partir de ce catalogue ; aucun identifiant Price à saisir. Les montants encaissés sont fixes. Stripe Tax, coupons, essais gratuits, quantités multiples et changements de plan en cours de période ne sont pas intégrés. Le vendeur doit définir les taxes applicables et la présentation légale des prix avant ouverture ; ne pas activer des ajustements de prix externes sans adapter la validation serveur et les tests.

## Point de terminaison Stripe

Créer dans le tableau de bord Stripe un webhook sur l’origine du jeu, chemin `/api/billing/webhook`, version `2025-04-30.basil`.

Événements à sélectionner :

- `checkout.session.completed`, `checkout.session.async_payment_succeeded` ;
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` ;
- `invoice.paid`, `invoice.payment_failed` ;
- `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.

Le serveur vérifie le corps brut et la signature HMAC SHA-256, tolérance de 300 secondes ; il accepte plusieurs signatures v1 pour une rotation. Événements test/live séparés. Un identifiant d’événement traité est conservé pour éviter les doublons. Les événements en échec ne sont pas marqués traités ; Stripe peut réessayer. Une action concurrente renvoie 503 au webhook pour permettre sa relivraison.

Pour les droits, le serveur relit les objets Stripe actuels, vérifie client, commande, devise, montant, mode et statut de paiement. Le retour `/offers?order=…` ne donne aucun droit ; il relance une vérification réservée au propriétaire de la commande. Les cartes différées ne sont pas proposées.

## Portail et politique de remboursement

Configurer le portail Stripe avec reçus/factures, mise à jour du moyen de paiement et **résiliation en fin de période**. Désactiver le changement de plan, les coupons et les pauses : ces parcours ne font pas partie de cette intégration. Tester le portail avant ouverture.

- Party Pass : 24 h à partir de la première confirmation du paiement par le serveur, sans prolongation lors d’un doublon de webhook. Une livraison tardive démarre les 24 h lors de cette première validation.
- Pack : droit rattaché à la commande, sans échéance technique ; la description précise la disponibilité du service/contenu.
- Plus : droit jusqu’à la fin de la période courante de l’abonnement, seulement si la facture courante et le paiement sont vérifiés. Échec de paiement : suspension ; paiement régularisé : rétablissement après vérification.
- Résiliation fin de période : accès jusqu’à son terme. Résiliation immédiate : retrait à réception de l’événement.
- **Remboursement intégral ou litige : retrait du droit. Pour un paiement d’abonnement, résiliation immédiate de l’abonnement chez Stripe pour arrêter aussi les renouvellements.** Un ancien paiement intégralement remboursé peut donc terminer l’abonnement associé encore actif. Informer le support de cette politique ; ne pas faire de remboursement de courtoisie intégral d’une ancienne facture sans en tenir compte.
- Remboursement partiel : droit conservé. Un litige gagné ne réactive pas automatiquement un abonnement déjà résilié ; traitement support puis nouvel achat explicite si souhaité.
- Suppression de compte : expire les checkouts ouverts, réconcilie les paiements terminés, résilie les abonnements avant suppression. Si Stripe est indisponible, la suppression échoue sans supprimer le compte ; réessayer après résolution. Les commandes sont dissociées du profil, pas détruites ni anonymisées chez Stripe.

Ces choix de code doivent être cohérents avec les conditions du vendeur et les droits applicables. La page `/terms` explicative ne remplace pas des CGV réelles. Définir aussi rétractation/prestation immédiate selon le public et le pays ; aucune renonciation implicite n’a été ajoutée.

## Recette marchande avant ouverture live

1. Configurer les variables en test dans une base distincte, puis le webhook et le portail.
2. Acheter chaque offre avec un moyen de paiement de test Stripe ; vérifier retour, reçu, prix, identité vendeur et activation.
3. Essayer 3-D Secure, refus, fermeture de l’onglet, retour tardif et renvoi d’un événement depuis Stripe.
4. Vérifier une échéance d’abonnement, échec puis régularisation, résiliation fin de période, expiration du pass, remboursement partiel/intégral et litige.
5. Avec trois navigateurs, vérifier que les invités jouent gratuitement aux questions payées par l’hôte.
6. Faire vérifier les informations de vente, taxes, support et modalités de remboursement. Tester sauvegarde/restauration D1, budget et alertes.
7. Configurer live avec ses propres clés et webhook ; ouvrir explicitement les achats. Suivre commandes, événements échoués et écarts de droits. Ne pas confondre les commandes initiales avec les renouvellements dans le chiffre d’affaires.

La reprise après panne repose sur les relivraisons Stripe et le bouton de vérification d’un achat. Il n’existe pas encore de réconciliation nocturne de tous les abonnements ni d’alertes automatiques de facturation : surveiller les échecs dans Stripe et organiser ce traitement avant de monter en volume. Les leases serveur durent deux minutes ; chaque appel Stripe a un délai maximal de huit secondes. Une accumulation anormale de commandes en attente ou de factures multi-paiements exige une intervention support.

## Références de l’intégration

Documentation officielle consultée :
- https://docs.stripe.com/api/checkout/sessions/create?api-version=2025-04-30.basil
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/api/invoice-payment/list?api-version=2025-04-30.basil
- https://docs.stripe.com/customer-management
