class StudioError(Exception):
    """Erreur de base de l'application."""


class MediaVerificationError(StudioError):
    """Un fichier média annoncé comme produit n'est pas valide."""


class ProviderError(StudioError):
    """Un fournisseur n'a pas pu produire le résultat demandé."""


class ProviderNotAvailable(ProviderError):
    """Fournisseur non implémenté dans ce jalon ou clé manquante."""


class BudgetNotApproved(StudioError):
    """Un appel payant dépasse le budget validé par l'utilisateur."""


class ScriptError(StudioError):
    """Scénario invalide."""
