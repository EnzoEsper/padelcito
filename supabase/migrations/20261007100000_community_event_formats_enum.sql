-- Tournament format rename and new suma subtype (separate migration: new enum values need commit before use).

alter type public.community_post_subtype rename value 'groups_knockout' to 'traditional';

alter type public.community_post_subtype add value if not exists 'suma';
